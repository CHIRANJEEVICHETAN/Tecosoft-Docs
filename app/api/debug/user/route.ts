import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    console.log('Debug: Clerk userId:', userId)
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'No Clerk user ID found',
        clerkUserId: null
      })
    }

    // Check if user exists by clerkId
    const userByClerkId = await prisma.user.findFirst({
      where: { clerkId: userId }
    })

    // Check all users to see what clerkIds exist
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        clerkId: true,
        name: true,
        role: true
      }
    })

    // Check if user exists by email (from Clerk)
    const clerkUser = await auth()
    let userByEmail = null
    
    if (clerkUser) {
      // We need to get the email from Clerk user object
      // For now, let's just check the common email from our seed
      const commonEmails = [
        'chiranjeevichetan1998@gmail.com',
        'sonuradha988@gmail.com',
        'chiranjeevichetan1996@gmail.com',
        'superadmin@docify.ai'
      ]
      
      for (const email of commonEmails) {
        const user = await prisma.user.findFirst({
          where: { email }
        })
        if (user) {
          userByEmail = user
          break
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        clerkUserId: userId,
        userByClerkId,
        userByEmail,
        allUsers,
        totalUsers: allUsers.length
      }
    })

} catch (error) {
    console.error('Debug API error:', error)
    if (error instanceof Error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Unknown error occurred',
      }, { status: 500 })
    }
  }
  
}