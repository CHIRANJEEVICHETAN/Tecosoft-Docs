import { redirect, notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role, ProjectMemberRole } from '@prisma/client'
import { DashboardLayout, SimpleDashboardHeader } from '@/components/dashboard'
import { ProjectSettingsForm } from '@/components/projects'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function ProjectSettingsPage({
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
  const hasOrgAccess = user.organizationId === project.organizationId && 
                      [Role.ORG_ADMIN, Role.SUPER_ADMIN].includes(user.role)
  const hasProjectAccess = userMembership && 
                          [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN].includes(userMembership.role)

  if (!hasOrgAccess && !hasProjectAccess) {
    redirect('/unauthorized')
  }

  const projectWithMetadata = {
    ...project,
    memberCount: project._count.members,
    documentCount: project._count.documents,
    canEdit: true, // User has edit access if they reached this page
    canDelete: hasOrgAccess || 
               (userMembership && userMembership.role === ProjectMemberRole.OWNER)
  }

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
          title={`Settings: ${project.name}`}
          description="Manage your project settings and configuration"
        />
        
        <ProjectSettingsForm 
          project={projectWithMetadata}
          onUpdate={(updatedProject) => {
            // Optionally handle the update, maybe show a toast
            console.log('Project updated:', updatedProject)
          }}
          onDelete={() => {
            // Redirect to projects list after deletion
            window.location.href = '/dashboard/projects'
          }}
        />
      </div>
    </DashboardLayout>
  )
}