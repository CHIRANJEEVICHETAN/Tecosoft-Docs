import { redirect, notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role, ProjectMemberRole } from '@prisma/client'
import { DashboardLayout, SimpleDashboardHeader } from '@/components/dashboard'
import { ProjectMemberManagement } from '@/components/projects'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function ProjectMembersPage({
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

  // Check if user can manage members
  const canManageMembers = hasOrgAccess && [Role.ORG_ADMIN, Role.SUPER_ADMIN].includes(user.role) ||
                          (userMembership && [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN].includes(userMembership.role))

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/projects/${params.projectId}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Project
            </Link>
          </Button>
        </div>
        
        <SimpleDashboardHeader 
          title={`Members: ${project.name}`}
          description="Manage team members and their access to this project"
        />
        
        <ProjectMemberManagement 
          projectId={params.projectId}
          projectName={project.name}
          canManageMembers={canManageMembers}
          currentUserId={user.id}
        />
      </div>
    </DashboardLayout>
  )
}