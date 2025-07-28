import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

interface UpdateRoleRequest {
  role: Role
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user with organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        organization: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is organization admin
    if (user.role !== 'ORG_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Organization admin role required.' },
        { status: 403 }
      )
    }

    const { memberId } = params
    const body: UpdateRoleRequest = await request.json()
    const { role } = body

    // Validate role
    if (!role || !Object.values(Role).includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Find the member to update
    const memberToUpdate = await prisma.user.findFirst({
      where: {
        id: memberId,
        organizationId: user.organizationId
      }
    })

    if (!memberToUpdate) {
      return NextResponse.json(
        { success: false, error: 'Team member not found' },
        { status: 404 }
      )
    }

    // Prevent changing your own role
    if (memberToUpdate.id === user.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot change your own role' },
        { status: 400 }
      )
    }

    // Update the user's role
    const updatedUser = await prisma.user.update({
      where: { id: memberId },
      data: { role }
    })

    // In a real implementation, you might also:
    // 1. Update Clerk user metadata
    // 2. Adjust project permissions based on new role
    // 3. Send a notification email about the role change
    // 4. Log the role change for audit purposes

    console.log(`Role updated for ${memberToUpdate.email}: ${memberToUpdate.role} -> ${role}`)

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        updatedAt: updatedUser.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Error updating team member role:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}