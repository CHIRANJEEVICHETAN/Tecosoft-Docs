import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'

export async function DELETE(
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

    // Handle pending invitations (mock)
    if (memberId.startsWith('pending_')) {
      // In a real implementation, you would:
      // 1. Find the invitation in the database
      // 2. Mark it as cancelled
      // 3. Optionally send a cancellation email
      
      console.log(`Mock invitation cancelled for member ID: ${memberId}`)
      
      return NextResponse.json({
        success: true,
        data: {
          id: memberId,
          status: 'cancelled'
        }
      })
    }

    // Find the member to remove
    const memberToRemove = await prisma.user.findFirst({
      where: {
        id: memberId,
        organizationId: user.organizationId
      }
    })

    if (!memberToRemove) {
      return NextResponse.json(
        { success: false, error: 'Team member not found' },
        { status: 404 }
      )
    }

    // Prevent removing yourself
    if (memberToRemove.id === user.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot remove yourself from the organization' },
        { status: 400 }
      )
    }

    // In a real implementation, you would:
    // 1. Remove the user from all project memberships
    // 2. Transfer ownership of any projects they own
    // 3. Clean up any user-specific data
    // 4. Remove the user from the organization
    // 5. Optionally send a notification email

    // Mock removal (don't actually delete from database in this demo)
    console.log(`Mock removal of user: ${memberToRemove.email} from organization: ${user.organization.name}`)

    return NextResponse.json({
      success: true,
      data: {
        id: memberId,
        status: 'removed'
      }
    })

  } catch (error) {
    console.error('Error removing team member:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}