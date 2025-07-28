import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

interface InviteRequest {
  email: string
  role: Role
  message?: string
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
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

    const body: InviteRequest = await request.json()
    const { email, role, message } = body

    // Validate request
    if (!email || !role) {
      return NextResponse.json(
        { success: false, error: 'Email and role are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate role
    if (!Object.values(Role).includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Check if user already exists in the organization
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        organizationId: user.organizationId
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User is already a member of this organization' },
        { status: 409 }
      )
    }

    // In a real implementation, you would:
    // 1. Create an invitation record in the database
    // 2. Send an email invitation using a service like SendGrid, Resend, etc.
    // 3. Generate a secure invitation token
    // 4. Set an expiration date for the invitation

    // Mock invitation creation
    const invitationId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const invitationToken = `token_${Math.random().toString(36).substr(2, 32)}`
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Mock email sending
    console.log(`Mock invitation sent to ${email}:`)
    console.log(`Organization: ${user.organization.name}`)
    console.log(`Role: ${role}`)
    console.log(`Invited by: ${user.name || user.email}`)
    console.log(`Message: ${message || 'No message'}`)
    console.log(`Invitation link: ${process.env.NEXT_PUBLIC_BASE_URL}/invite/${invitationToken}`)

    // In a real implementation, you would store this in a database table like:
    /*
    await prisma.invitation.create({
      data: {
        id: invitationId,
        email,
        role,
        message,
        token: invitationToken,
        organizationId: user.organizationId,
        invitedById: user.id,
        expiresAt,
        status: 'PENDING'
      }
    })
    */

    return NextResponse.json({
      success: true,
      data: {
        id: invitationId,
        email,
        role,
        status: 'sent',
        expiresAt: expiresAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Error sending team invitation:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}