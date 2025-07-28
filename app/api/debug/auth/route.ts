import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    console.log('Debug auth API: Starting...')
    
    // Test auth() function
    const authResult = await auth()
    console.log('Debug auth API: auth() result:', authResult)
    
    // Test currentUser() function
    const clerkUser = await currentUser()
    console.log('Debug auth API: currentUser() result:', clerkUser ? 'FOUND' : 'NOT FOUND')
    
    return NextResponse.json({
      success: true,
      data: {
        auth: {
          userId: authResult.userId,
          sessionId: authResult.sessionId,
          orgId: authResult.orgId,
          orgRole: authResult.orgRole,
          orgSlug: authResult.orgSlug
        },
        currentUser: clerkUser ? {
          id: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName
        } : null,
        headers: {
          authorization: request.headers.get('authorization'),
          cookie: request.headers.get('cookie') ? 'PRESENT' : 'MISSING'
        }
      }
    })

  } catch (error) {
    console.error('Debug auth API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}