import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { EmailService } from '@/lib/services/email-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Get invitation by token
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if invitation is expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Invitation has already been ${invitation.status}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        message: invitation.message,
        organization: invitation.organization,
        invitedBy: invitation.invitedBy,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt
      }
    })

  } catch (error) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body // 'accept' or 'decline'

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "accept" or "decline"' },
        { status: 400 }
      )
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Get invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: true
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Verify the invitation is for the current user's email
    if (invitation.email !== currentUser.email) {
      return NextResponse.json(
        { success: false, error: 'This invitation is not for your email address' },
        { status: 403 }
      )
    }

    // Check if invitation is expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Invitation has already been ${invitation.status}` },
        { status: 400 }
      )
    }

    if (action === 'accept') {
      // Accept invitation - update user's organization and role
      await prisma.$transaction(async (tx) => {
        // Update user's organization and role
        await tx.user.update({
          where: { id: currentUser.id },
          data: {
            organizationId: invitation.organizationId,
            role: invitation.role
          }
        })

        // Mark invitation as accepted
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: 'accepted' }
        })
      })

      // Send welcome email
      try {
        await EmailService.sendWelcomeEmail(
          currentUser.email,
          currentUser.name || currentUser.email,
          invitation.organization.name
        )
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError)
        // Don't fail the request if email fails
      }

      return NextResponse.json({
        success: true,
        data: {
          message: 'Invitation accepted successfully',
          organization: invitation.organization,
          role: invitation.role
        }
      })

    } else {
      // Decline invitation
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'declined' }
      })

      return NextResponse.json({
        success: true,
        data: {
          message: 'Invitation declined'
        }
      })
    }

  } catch (error) {
    console.error('Error processing invitation:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}