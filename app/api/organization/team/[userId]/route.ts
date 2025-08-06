import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { z } from 'zod'

const updateRoleSchema = z.object({
  role: z.nativeEnum(Role)
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: currentUserId } = await auth()
    const { userId: targetUserId } = await params
    
    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate request body
    const body = await request.json()
    const validation = updateRoleSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { role } = validation.data

    // Get current user with organization
    const currentUser = await prisma.user.findUnique({
      where: { clerkId: currentUserId },
      include: { organization: true }
    })

    if (!currentUser || !currentUser.organization) {
      return NextResponse.json(
        { success: false, error: 'User or organization not found' },
        { status: 404 }
      )
    }

    // Check if current user is organization admin
    if (currentUser.role !== Role.ORG_ADMIN && currentUser.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Organization admin role required.' },
        { status: 403 }
      )
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    })

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Check if target user is in the same organization
    if (targetUser.organizationId !== currentUser.organizationId) {
      return NextResponse.json(
        { success: false, error: 'User is not in your organization' },
        { status: 403 }
      )
    }

    // Prevent changing super admin roles
    if (targetUser.role === Role.SUPER_ADMIN || role === Role.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Cannot modify super admin roles' },
        { status: 403 }
      )
    }

    // Prevent users from changing their own role
    if (targetUser.clerkId === currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot change your own role' },
        { status: 403 }
      )
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: `User role updated to ${role.toLowerCase().replace('_', ' ')}`
    })

  } catch (error) {
    console.error('Error updating user role:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: currentUserId } = await auth()
    const { userId: targetUserId } = await params
    
    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current user with organization
    const currentUser = await prisma.user.findUnique({
      where: { clerkId: currentUserId },
      include: { organization: true }
    })

    if (!currentUser || !currentUser.organization) {
      return NextResponse.json(
        { success: false, error: 'User or organization not found' },
        { status: 404 }
      )
    }

    // Check if current user is organization admin
    if (currentUser.role !== Role.ORG_ADMIN && currentUser.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Organization admin role required.' },
        { status: 403 }
      )
    }

    // Handle pending invitations (mock) - these have IDs starting with 'pending_'
    if (targetUserId.startsWith('pending_')) {
      console.log(`Mock invitation cancelled for member ID: ${targetUserId}`)
      
      return NextResponse.json({
        success: true,
        data: {
          id: targetUserId,
          status: 'cancelled'
        }
      })
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    })

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Check if target user is in the same organization
    if (targetUser.organizationId !== currentUser.organizationId) {
      return NextResponse.json(
        { success: false, error: 'User is not in your organization' },
        { status: 403 }
      )
    }

    // Prevent removing super admins
    if (targetUser.role === Role.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove super admin users' },
        { status: 403 }
      )
    }

    // Prevent users from removing themselves
    if (targetUser.clerkId === currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove yourself from the organization' },
        { status: 403 }
      )
    }

    // Remove user from organization (this will cascade delete project memberships)
    await prisma.user.delete({
      where: { id: targetUserId }
    })

    return NextResponse.json({
      success: true,
      message: 'User removed from organization successfully'
    })

  } catch (error) {
    console.error('Error removing user:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}