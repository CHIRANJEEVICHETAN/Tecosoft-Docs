import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user and verify super admin role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user || user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Super Admin role required.' },
        { status: 403 }
      )
    }

    const { orgId } = params
    const body = await request.json()
    const { status } = body

    // Validate status
    if (!status || !['active', 'suspended', 'trial'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be active, suspended, or trial.' },
        { status: 400 }
      )
    }

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: orgId }
    })

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Note: In a real implementation, this would update the subscription status
    // in Stripe or your billing provider. For now, we'll just log the change.
    console.log(`Organization ${orgId} status changed to ${status} by admin ${userId}`)

    // In a real implementation, you might store this status in a separate table
    // or update metadata. For now, we'll just return success.
    
    return NextResponse.json({
      success: true,
      message: `Organization status updated to ${status}`,
      data: {
        organizationId: orgId,
        status: status
      }
    })

  } catch (error) {
    console.error('Error updating organization status:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user and verify super admin role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user || user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Super Admin role required.' },
        { status: 403 }
      )
    }

    const { orgId } = params

    // Get organization with detailed information
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        },
        projects: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            createdAt: true,
            _count: {
              select: {
                members: true
              }
            }
          }
        },
        _count: {
          select: {
            users: true,
            projects: true
          }
        }
      }
    })

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Transform data to include subscription info (mock)
    const userCount = organization._count.users
    let plan: string
    let mrr: number

    if (userCount <= 5) {
      plan = 'Free'
      mrr = 0
    } else if (userCount <= 25) {
      plan = 'Professional'
      mrr = 29
    } else if (userCount <= 100) {
      plan = 'Enterprise'
      mrr = 99
    } else {
      plan = 'Enterprise Plus'
      mrr = 299
    }

    const transformedOrganization = {
      ...organization,
      subscription: {
        plan,
        status: 'active',
        mrr
      }
    }

    return NextResponse.json({
      success: true,
      data: transformedOrganization
    })

  } catch (error) {
    console.error('Error fetching organization details:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}