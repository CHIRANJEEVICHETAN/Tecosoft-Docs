import { redirect, notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role, ProjectMemberRole } from '@prisma/client'
import { DashboardLayout } from '@/components/dashboard'
import { ProjectOverview } from '@/components/projects'

export default async function ProjectPage({
  params
}: {
  params: { projectId: string }
}) {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Get user
  const user = await prisma.user.findUnique({
    where: { clerkId: userId }
  })

  if (!user) {
    redirect('/unauthorized')
  }

  // Get project with access check
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      members: {
        where: { userId: user.id }
      },
      _count: {
        select: {
          members: true,
          documents: true
        }
      }
    }
  })

  if (!project) {
    notFound()
  }

  // Check access permissions
  const userMembership = project.members[0]
  const hasOrgAccess = user.organizationId === project.organizationId
  const isSuperAdmin = user.role === Role.SUPER_ADMIN

  if (!userMembership && !hasOrgAccess && !isSuperAdmin) {
    redirect('/unauthorized')
  }

  // Get recent activity data
  const [recentDocuments, activeMembers, documentStats] = await Promise.all([
    // Recent documents
    prisma.document.findMany({
      where: { projectId: params.projectId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 5
    }),
    
    // Active members
    prisma.projectMember.findMany({
      where: { projectId: params.projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    }),
    
    // Document statistics
    prisma.document.groupBy({
      by: ['status'],
      where: { projectId: params.projectId },
      _count: true
    })
  ])

  // Calculate permissions
  const canEdit = hasOrgAccess || 
                  (userMembership && [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN].includes(userMembership.role))
  
  const canManageMembers = hasOrgAccess || 
                          (userMembership && [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN].includes(userMembership.role))
  
  const canCreateDocuments = hasOrgAccess || 
                            (userMembership && [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN, ProjectMemberRole.MEMBER].includes(userMembership.role))

  // Process document stats
  const publishedCount = documentStats.find(stat => stat.status === 'PUBLISHED')?._count || 0
  const draftCount = documentStats.find(stat => stat.status === 'DRAFT')?._count || 0

  const projectWithActivity = {
    ...project,
    memberCount: project._count.members,
    documentCount: project._count.documents,
    recentActivity: {
      totalDocuments: project._count.documents,
      publishedDocuments: publishedCount,
      draftDocuments: draftCount,
      recentDocuments: recentDocuments.map(doc => ({
        id: doc.id,
        title: doc.title,
        status: doc.status,
        updatedAt: doc.updatedAt.toISOString(),
        author: doc.author
      })),
      activeMembers: activeMembers.map(member => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        imageUrl: member.user.imageUrl,
        role: member.role
      }))
    }
  }

  return (
    <DashboardLayout>
      <ProjectOverview 
        project={projectWithActivity}
        canEdit={canEdit}
        canManageMembers={canManageMembers}
        canCreateDocuments={canCreateDocuments}
      />
    </DashboardLayout>
  )
}