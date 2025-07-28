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

    // Mock recent generations data
    // In a real implementation, this would query from an AI generations table
    const mockGenerations = [
      {
        id: 'gen_1',
        content: 'This is a sample AI-generated content about API documentation. It includes best practices for writing clear and comprehensive API guides that help developers understand and implement your services effectively.',
        usage: 15,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        type: 'generate'
      },
      {
        id: 'gen_2',
        content: 'Improved version of user authentication guide with enhanced clarity, better examples, and step-by-step instructions for implementing secure authentication flows in modern applications.',
        usage: 12,
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        type: 'improve'
      },
      {
        id: 'gen_3',
        content: 'Summary: The document covers three main areas: setup procedures, configuration options, and troubleshooting steps. Key points include environment setup, security considerations, and common issues resolution.',
        usage: 8,
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        type: 'summarize'
      },
      {
        id: 'gen_4',
        content: 'Comprehensive guide for new team members covering project structure, development workflow, coding standards, and deployment procedures. Includes practical examples and helpful resources.',
        usage: 20,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        type: 'generate'
      },
      {
        id: 'gen_5',
        content: 'Enhanced technical specification with improved formatting, clearer explanations, and additional code examples. Restructured for better readability and developer experience.',
        usage: 18,
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        type: 'improve'
      }
    ]

    return NextResponse.json({
      success: true,
      data: mockGenerations
    })

  } catch (error) {
    console.error('Error fetching recent AI generations:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}