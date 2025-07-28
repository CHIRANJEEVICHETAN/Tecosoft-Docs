import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
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

    // Check if the current user is a SUPER_ADMIN
    const currentUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!currentUser || currentUser.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Only SUPER_ADMIN can update user Clerk IDs' },
        { status: 403 }
      )
    }

    const { email, clerkId } = await request.json()
    
    if (!email || !clerkId) {
      return NextResponse.json(
        { error: 'Email and clerkId are required' },
        { status: 400 }
      )
    }

    // Update the user's Clerk ID
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { clerkId }
    })

    return NextResponse.json({
      message: 'User Clerk ID updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        clerkId: updatedUser.clerkId
      }
    })

  } catch (error) {
    console.error('Error updating user Clerk ID:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}