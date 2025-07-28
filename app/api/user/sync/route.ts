import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const clerkUser = await currentUser()
    
    if (!clerkUser) {
      return NextResponse.json(
        { error: 'User not found in Clerk' },
        { status: 404 }
      )
    }

    // Check if user already exists by clerkId
    let existingUser = await prisma.user.findFirst({
      where: { clerkId: userId }
    })

    if (existingUser) {
      return NextResponse.json({
        message: 'User already exists',
        user: existingUser
      })
    }

    // Check if user exists by email but without clerkId (from seed data)
    const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress || ''
    const userByEmail = await prisma.user.findFirst({
      where: { 
        email: primaryEmail,
        clerkId: null
      }
    })

    if (userByEmail) {
      // Update existing user with Clerk information
      const updatedUser = await prisma.user.update({
        where: { id: userByEmail.id },
        data: {
          clerkId: userId,
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || userByEmail.name,
          firstName: clerkUser.firstName || userByEmail.firstName,
          lastName: clerkUser.lastName || userByEmail.lastName,
          imageUrl: clerkUser.imageUrl || userByEmail.imageUrl,
        }
      })

      return NextResponse.json({
        message: 'User synced successfully (updated existing)',
        user: updatedUser
      })
    }

    // Determine role based on email (for demo purposes)
    let role = Role.USER
    let organizationId: string | null = null
    
    if (primaryEmail.includes('superadmin') || primaryEmail === 'superadmin@docify.ai') {
      role = Role.SUPER_ADMIN
      organizationId = null // SUPER_ADMIN is not tied to any organization
    } else {
      // For non-super-admin users, get or create default organization
      let defaultOrg = await prisma.organization.findFirst({
        where: { slug: 'default-org' }
      })

      if (!defaultOrg) {
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
      } else if (primaryEmail.includes('manager')) {
        role = Role.MANAGER
      }
    }

    // Create user in database
    const user = await prisma.user.create({
      data: {
        clerkId: userId,
        email: primaryEmail,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || primaryEmail,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        role,
        organizationId
      }
    })

    return NextResponse.json({
      message: 'User synced successfully',
      user
    })

  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}