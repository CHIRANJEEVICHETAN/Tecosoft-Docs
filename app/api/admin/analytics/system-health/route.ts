import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

interface SystemHealth {
    status: 'healthy' | 'warning' | 'critical'
    uptime: number
    responseTime: number
    errorRate: number
    memoryUsage: number
    cpuUsage: number
    diskUsage: number
    activeConnections: number
    lastUpdated: string
    services: {
        database: 'healthy' | 'warning' | 'critical'
        auth: 'healthy' | 'warning' | 'critical'
        storage: 'healthy' | 'warning' | 'critical'
        ai: 'healthy' | 'warning' | 'critical'
    }
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

        // Get system health metrics
        const systemHealth = await getSystemHealthMetrics()

        return NextResponse.json({
            success: true,
            data: systemHealth
        })
    } catch (error) {
        console.error('Error fetching system health:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

async function getSystemHealthMetrics(): Promise<SystemHealth> {
    const startTime = Date.now()

    // Check database health
    const dbHealth = await checkDatabaseHealth()

    // Check auth service health
    const authHealth = await checkAuthHealth()

    // Check storage health (simulated)
    const storageHealth = await checkStorageHealth()

    // Check AI services health (simulated)
    const aiHealth = await checkAIHealth()

    const responseTime = Date.now() - startTime

    // Get basic system metrics (simulated for demo)
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()

    // Calculate overall status
    const services = {
        database: dbHealth,
        auth: authHealth,
        storage: storageHealth,
        ai: aiHealth
    }

    const serviceStatuses = Object.values(services)
    const overallStatus = serviceStatuses.includes('critical')
        ? 'critical'
        : serviceStatuses.includes('warning')
            ? 'warning'
            : 'healthy'

    return {
        status: overallStatus,
        uptime: Math.floor(uptime),
        responseTime,
        errorRate: Math.random() * 2, // Simulated error rate
        memoryUsage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        cpuUsage: Math.round(Math.random() * 30 + 10), // Simulated CPU usage
        diskUsage: Math.round(Math.random() * 20 + 40), // Simulated disk usage
        activeConnections: Math.floor(Math.random() * 100 + 50), // Simulated connections
        lastUpdated: new Date().toISOString(),
        services
    }
}

async function checkDatabaseHealth(): Promise<'healthy' | 'warning' | 'critical'> {
    try {
        const startTime = Date.now()
        await prisma.$queryRaw`SELECT 1`
        const responseTime = Date.now() - startTime

        if (responseTime > 1000) return 'warning'
        if (responseTime > 2000) return 'critical'
        return 'healthy'
    } catch (error) {
        console.error('Database health check failed:', error)
        return 'critical'
    }
}

async function checkAuthHealth(): Promise<'healthy' | 'warning' | 'critical'> {
    try {
        // Simple check - if we can access Clerk API
        const response = await fetch('https://api.clerk.com/v1/health', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`
            }
        })

        if (response.ok) return 'healthy'
        if (response.status < 500) return 'warning'
        return 'critical'
    } catch (error) {
        console.error('Auth health check failed:', error)
        return 'warning' // Auth issues are usually not critical for read operations
    }
}

async function checkStorageHealth(): Promise<'healthy' | 'warning' | 'critical'> {
    // Simulated storage health check
    // In a real implementation, you'd check your file storage service
    const random = Math.random()
    if (random > 0.9) return 'warning'
    if (random > 0.95) return 'critical'
    return 'healthy'
}

async function checkAIHealth(): Promise<'healthy' | 'warning' | 'critical'> {
    // Simulated AI service health check
    // In a real implementation, you'd check OpenAI, Anthropic, etc.
    const random = Math.random()
    if (random > 0.85) return 'warning'
    if (random > 0.95) return 'critical'
    return 'healthy'
}