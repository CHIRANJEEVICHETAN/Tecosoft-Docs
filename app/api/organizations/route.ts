import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { MultiTenantService, CreateOrganizationInput } from '@/lib/multi-tenant'
import { Role } from '@prisma/client'

/**
 * GET /api/organizations
 * Get all organizations for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and their organization
    const user = await MultiTenantService.getUserByClerkId(userId)
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // For super admins, return all organizations
    if (user.role === Role.SUPER_ADMIN) {
      // This would require a new method to get all organizations
      // For now, just return the user's organization
      return NextResponse.json([user.organization])
    }

    // Regular users see only their organization
    return NextResponse.json([user.organization])
  } catch (error) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/organizations
 * Create a new organization (Super Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super admin
    const user = await MultiTenantService.getUserByClerkId(userId)
    
    if (!user || user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Only super admins can create organizations' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, slug, description }: CreateOrganizationInput = body

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    // Check if slug is already taken
    const existingOrg = await MultiTenantService.getOrganizationBySlug(slug)
    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization slug already exists' },
        { status: 409 }
      )
    }

    const organization = await MultiTenantService.createOrganization({
      name,
      slug,
      description,
    })

    return NextResponse.json({
      message: 'Organization created successfully',
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        description: organization.description,
        createdAt: organization.createdAt,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating organization:', error)
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    )
  }
}
