import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
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

    // Get all team members in the organization
    const teamMembers = await prisma.user.findMany({
      where: {
        organizationId: user.organizationId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        imageUrl: true,
        createdAt: true
      },
      orderBy: [
        { role: 'asc' }, // Order by role hierarchy
        { createdAt: 'asc' }
      ]
    })

    const formattedTeamMembers = teamMembers.map(member => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      imageUrl: member.imageUrl,
      createdAt: member.createdAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      data: formattedTeamMembers
    })

  } catch (error) {
    console.error('Error fetching organization team:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}