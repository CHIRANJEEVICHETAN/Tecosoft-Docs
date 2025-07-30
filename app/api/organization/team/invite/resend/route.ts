import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

interface ResendInviteRequest {
  email: string
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

    const body: ResendInviteRequest = await request.json()
    const { email } = body

    // Validate request
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // In a real implementation, you would:
    // 1. Find the existing invitation in the database
    // 2. Check if it's still valid (not expired)
    // 3. Generate a new token if needed
    // 4. Resend the email invitation

    // Mock resend logic
    console.log(`Mock invitation resent to ${email}`)
    console.log(`Organization: ${user.organization.name}`)
    console.log(`Resent by: ${user.name || user.email}`)

    return NextResponse.json({
      success: true,
      data: {
        email,
        status: 'resent',
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error resending team invitation:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}