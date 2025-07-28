import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role, ProjectMemberRole } from '@prisma/client'
import { Permission } from '@/lib/middleware/rbac-middleware'

// Role to permissions mapping
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),
  [Role.ORG_ADMIN]: [
    Permission.MANAGE_ORGANIZATION,
    Permission.MANAGE_USERS,
    Permission.CREATE_PROJECT,
    Permission.MANAGE_PROJECT,
    Permission.VIEW_PROJECT,
    Permission.CREATE_DOCUMENT,
    Permission.EDIT_DOCUMENT,
    Permission.DELETE_DOCUMENT,
    Permission.VIEW_DOCUMENT,
    Permission.VIEW_ANALYTICS,
    Permission.EXPORT_DATA,
  ],
  [Role.MANAGER]: [
    Permission.CREATE_PROJECT,
    Permission.MANAGE_PROJECT,
    Permission.VIEW_PROJECT,
    Permission.CREATE_DOCUMENT,
    Permission.EDIT_DOCUMENT,
    Permission.DELETE_DOCUMENT,
    Permission.VIEW_DOCUMENT,
    Permission.VIEW_ANALYTICS,
  ],
  [Role.USER]: [
    Permission.VIEW_PROJECT,
    Permission.CREATE_DOCUMENT,
    Permission.EDIT_DOCUMENT,
    Permission.VIEW_DOCUMENT,
  ],
  [Role.VIEWER]: [
    Permission.VIEW_PROJECT,
    Permission.VIEW_DOCUMENT,
  ],
}

// Project role to permissions mapping
const PROJECT_ROLE_PERMISSIONS: Record<ProjectMemberRole, Permission[]> = {
  [ProjectMemberRole.OWNER]: [
    Permission.MANAGE_PROJECT,
    Permission.VIEW_PROJECT,
    Permission.CREATE_DOCUMENT,
    Permission.EDIT_DOCUMENT,
    Permission.DELETE_DOCUMENT,
    Permission.VIEW_DOCUMENT,
  ],
  [ProjectMemberRole.ADMIN]: [
    Permission.MANAGE_PROJECT,
    Permission.VIEW_PROJECT,
    Permission.CREATE_DOCUMENT,
    Permission.EDIT_DOCUMENT,
    Permission.DELETE_DOCUMENT,
    Permission.VIEW_DOCUMENT,
  ],
  [ProjectMemberRole.MEMBER]: [
    Permission.VIEW_PROJECT,
    Permission.CREATE_DOCUMENT,
    Permission.EDIT_DOCUMENT,
    Permission.VIEW_DOCUMENT,
  ],
  [ProjectMemberRole.VIEWER]: [
    Permission.VIEW_PROJECT,
    Permission.VIEW_DOCUMENT,
  ],
}

// Function to automatically sync user from Clerk to database
async function syncUserFromClerk(clerkUserId: string) {
  console.log('User role API: Attempting to sync user from Clerk:', clerkUserId)
  
  try {
    const clerkUser = await currentUser()
    
    if (!clerkUser || clerkUser.id !== clerkUserId) {
      console.log('User role API: Clerk user not found or ID mismatch')
      return null
    }

    const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress || ''
    console.log('User role API: Syncing user with email:', primaryEmail)

    // Check if user exists by email (regardless of clerkId)
    const userByEmail = await prisma.user.findFirst({
      where: { 
        email: primaryEmail
      }
    })

    if (userByEmail) {
      console.log('User role API: Found existing user by email, updating with Clerk ID')
      // Update existing user with Clerk information
      const updatedUser = await prisma.user.update({
        where: { id: userByEmail.id },
        data: {
          clerkId: clerkUserId,
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || userByEmail.name,
          firstName: clerkUser.firstName || userByEmail.firstName,
          lastName: clerkUser.lastName || userByEmail.lastName,
          imageUrl: clerkUser.imageUrl || userByEmail.imageUrl,
        }
      })
      console.log('User role API: Successfully updated existing user')
      return updatedUser
    }

    // Determine role and organization based on email (for demo purposes)
    let role = Role.USER
    let organizationId: string | null = null
    
    if (primaryEmail.includes('superadmin') || primaryEmail === 'superadmin@docify.ai') {
      role = Role.SUPER_ADMIN
      organizationId = null // SUPER_ADMIN is not tied to any organization
      console.log('User role API: Assigning SUPER_ADMIN role')
    } else {
      // For non-super-admin users, get or create default organization
      let defaultOrg = await prisma.organization.findFirst({
        where: { slug: 'default-org' }
      })

      if (!defaultOrg) {
        console.log('User role API: Creating default organization')
        defaultOrg = await prisma.organization.create({
          data: {
            name: 'Default Organization',
            slug: 'default-org',
            description: 'Default organization for new users'
          }
        })
      }
      
      organizationId = defaultOrg.id
      
      if (primaryEmail.includes('admin')) {
        role = Role.ORG_ADMIN
        console.log('User role API: Assigning ORG_ADMIN role')
      } else if (primaryEmail.includes('manager')) {
        role = Role.MANAGER
        console.log('User role API: Assigning MANAGER role')
      } else {
        console.log('User role API: Assigning USER role')
      }
    }

    // Create new user in database
    console.log('User role API: Creating new user in database')
    const newUser = await prisma.user.create({
      data: {
        clerkId: clerkUserId,
        email: primaryEmail,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || primaryEmail,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        role,
        organizationId
      }
    })

    console.log('User role API: Successfully created new user:', newUser.id)
    return newUser

  } catch (error) {
    console.error('User role API: Error syncing user from Clerk:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    console.log('User role API: Clerk userId:', userId)
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user with full includes
    let user = await prisma.user.findFirst({
      where: { clerkId: userId },
      include: {
        organization: {
          select: {
            id: true,
            slug: true,
            name: true
          }
        },
        projectMembers: {
          include: {
            project: {
              select: {
                id: true,
                slug: true,
                name: true
              }
            }
          }
        }
      }
    })

    console.log('User role API: Found user with includes:', !!user)
    
    if (user) {
      console.log('User role API: User details:', {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        projectMembersCount: user.projectMembers?.length || 0
      })
    }

    if (!user) {
      console.log('User role API: User not found by clerkId, attempting auto-sync:', userId)
      
      // Try to sync user from Clerk automatically
      const syncedUser = await syncUserFromClerk(userId)
      
      if (!syncedUser) {
        console.log('User role API: Auto-sync failed for user:', userId)
        return NextResponse.json(
          { 
            success: false, 
            error: 'User not found and could not be synced. Please contact support.',
            debug: {
              clerkUserId: userId,
              suggestion: 'Try signing out and signing back in, or contact support'
            }
          },
          { status: 404 }
        )
      }
      
      console.log('User role API: Auto-sync successful, re-fetching user with includes')
      
      // Re-fetch the user with includes after sync
      user = await prisma.user.findFirst({
        where: { clerkId: userId },
        include: {
          organization: {
            select: {
              id: true,
              slug: true,
              name: true
            }
          },
          projectMembers: {
            include: {
              project: {
                select: {
                  id: true,
                  slug: true,
                  name: true
                }
              }
            }
          }
        }
      })
      
      if (!user) {
        console.log('User role API: Failed to re-fetch user after sync')
        return NextResponse.json(
          { 
            success: false, 
            error: 'User sync completed but failed to retrieve user data'
          },
          { status: 500 }
        )
      }
    }

    console.log('User role API: Processing user permissions...')
    
    // Get organization-level permissions
    const organizationPermissions = ROLE_PERMISSIONS[user.role] || []
    console.log('User role API: Organization permissions count:', organizationPermissions.length)

    // Get project-level roles and permissions
    const projectRoles: Record<string, ProjectMemberRole> = {}
    const projectPermissions: Record<string, Permission[]> = {}

    if (user.projectMembers) {
      user.projectMembers.forEach((member: any) => {
        projectRoles[member.projectId] = member.role as ProjectMemberRole
        projectPermissions[member.projectId] = PROJECT_ROLE_PERMISSIONS[member.role as ProjectMemberRole] || []
      })
      console.log('User role API: Project memberships processed:', user.projectMembers.length)
    }

    // For SUPER_ADMIN, they have access to all projects in all organizations
    if (user.role === Role.SUPER_ADMIN) {
      // Get all projects across all organizations for SUPER_ADMIN
      const allProjects = await prisma.project.findMany({
        select: {
          id: true,
          slug: true,
          name: true
        }
      })
      
      // Give SUPER_ADMIN OWNER role on all projects
      allProjects.forEach(project => {
        projectRoles[project.id] = ProjectMemberRole.OWNER
        projectPermissions[project.id] = PROJECT_ROLE_PERMISSIONS[ProjectMemberRole.OWNER] || []
      })
    }

    const userRole = {
      role: user.role,
      organizationId: user.organizationId || null,
      organizationSlug: user.organization?.slug || null,
      permissions: organizationPermissions,
      projectRoles,
      projectPermissions
    }

    console.log('User role API: Returning user role data:', {
      role: userRole.role,
      organizationId: userRole.organizationId,
      permissionsCount: userRole.permissions.length,
      projectRolesCount: Object.keys(userRole.projectRoles).length
    })

    return NextResponse.json({
      success: true,
      data: userRole
    })

  } catch (error) {
    console.error('Error fetching user role:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    if (errorStack) {
      console.error('Error stack:', errorStack)
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}