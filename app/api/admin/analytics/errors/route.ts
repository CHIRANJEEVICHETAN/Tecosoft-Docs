import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

interface ErrorLog {
  id: string
  timestamp: string
  level: 'error' | 'warning' | 'info'
  message: string
  source: string
  count: number
  lastOccurrence: string
  stack?: string
  userAgent?: string
  url?: string
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is Super Admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true }
    })

    if (!user || user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get error logs
    const errorLogs = await getErrorLogs(level, limit)

    return NextResponse.json({
      success: true,
      data: errorLogs
    })
  } catch (error) {
    console.error('Error fetching error logs:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getErrorLogs(level: string, limit: number): Promise<ErrorLog[]> {
  // In a real implementation, you'd fetch from your logging system
  // For now, we'll generate simulated error logs
  
  const errorTypes = [
    {
      level: 'error' as const,
      message: 'Database connection timeout',
      source: 'database',
      count: Math.floor(Math.random() * 10 + 1)
    },
    {
      level: 'error' as const,
      message: 'Failed to authenticate user',
      source: 'auth',
      count: Math.floor(Math.random() * 5 + 1)
    },
    {
      level: 'warning' as const,
      message: 'Slow query detected',
      source: 'database',
      count: Math.floor(Math.random() * 20 + 5)
    },
    {
      level: 'error' as const,
      message: 'AI service unavailable',
      source: 'ai',
      count: Math.floor(Math.random() * 3 + 1)
    },
    {
      level: 'warning' as const,
      message: 'High memory usage detected',
      source: 'system',
      count: Math.floor(Math.random() * 15 + 3)
    },
    {
      level: 'error' as const,
      message: 'File upload failed',
      source: 'storage',
      count: Math.floor(Math.random() * 8 + 2)
    },
    {
      level: 'warning' as const,
      message: 'Rate limit exceeded',
      source: 'api',
      count: Math.floor(Math.random() * 25 + 10)
    },
    {
      level: 'info' as const,
      message: 'User session expired',
      source: 'auth',
      count: Math.floor(Math.random() * 50 + 20)
    },
    {
      level: 'error' as const,
      message: 'Payment processing failed',
      source: 'billing',
      count: Math.floor(Math.random() * 5 + 1)
    },
    {
      level: 'warning' as const,
      message: 'Cache miss rate high',
      source: 'cache',
      count: Math.floor(Math.random() * 12 + 5)
    }
  ]

  const filteredErrors = level === 'all' 
    ? errorTypes 
    : errorTypes.filter(error => error.level === level)

  const now = new Date()
  
  return filteredErrors.slice(0, limit).map((error, index) => {
    const timestamp = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000) // Random time in last 24h
    const lastOccurrence = new Date(now.getTime() - Math.random() * 60 * 60 * 1000) // Random time in last hour
    
    return {
      id: `error-${index + 1}`,
      timestamp: timestamp.toISOString(),
      level: error.level,
      message: error.message,
      source: error.source,
      count: error.count,
      lastOccurrence: lastOccurrence.toISOString(),
      stack: error.level === 'error' ? generateStackTrace(error.message) : undefined,
      userAgent: Math.random() > 0.5 ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' : undefined,
      url: generateErrorUrl(error.source)
    }
  }).sort((a, b) => new Date(b.lastOccurrence).getTime() - new Date(a.lastOccurrence).getTime())
}

function generateStackTrace(message: string): string {
  const stacks = [
    `Error: ${message}\n    at DatabaseService.connect (/app/lib/database.ts:45:12)\n    at async handler (/app/api/projects/route.ts:23:5)`,
    `Error: ${message}\n    at AuthService.validateToken (/app/lib/auth.ts:78:15)\n    at middleware (/app/middleware.ts:34:8)`,
    `Error: ${message}\n    at AIService.generateContent (/app/lib/ai.ts:92:10)\n    at async POST (/app/api/ai/generate/route.ts:45:7)`,
    `Error: ${message}\n    at StorageService.uploadFile (/app/lib/storage.ts:56:8)\n    at async uploadHandler (/app/api/upload/route.ts:67:12)`
  ]
  
  return stacks[Math.floor(Math.random() * stacks.length)]
}

function generateErrorUrl(source: string): string {
  const urls = {
    database: '/api/projects',
    auth: '/api/auth/callback',
    ai: '/api/ai/generate',
    storage: '/api/upload',
    system: '/api/health',
    api: '/api/users',
    cache: '/api/dashboard',
    billing: '/api/billing/webhook'
  }
  
  return urls[source as keyof typeof urls] || '/api/unknown'
}