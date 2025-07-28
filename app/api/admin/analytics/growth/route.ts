import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

interface GrowthMetrics {
    period: string
    organizationsGrowth: Array<{
        date: string
        count: number
        growth: number
    }>
    usersGrowth: Array<{
        date: string
        count: number
        growth: number
    }>
    revenueGrowth: Array<{
        date: string
        amount: number
        growth: number
    }>
    projectsGrowth: Array<{
        date: string
        count: number
        growth: number
    }>
    documentsGrowth: Array<{
        date: string
        count: number
        growth: number
    }>
}

type GrowthEntry = {
    date: string
    count: number
    growth: number
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
        const period = searchParams.get('period') || '30d'

        // Get growth metrics
        const growthMetrics = await getGrowthMetrics(period)

        return NextResponse.json({
            success: true,
            data: growthMetrics
        })
    } catch (error) {
        console.error('Error fetching growth metrics:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

async function getGrowthMetrics(period: string): Promise<GrowthMetrics> {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const now = new Date()

    // Generate date range
    const dates = Array.from({ length: days }, (_, i) => {
        const date = new Date(now)
        date.setDate(date.getDate() - (days - 1 - i))
        return date.toISOString().split('T')[0]
    })

    // Get real organization growth data
    const organizationGrowthData = await getOrganizationGrowthData(dates)

    // Get real user growth data
    const userGrowthData = await getUserGrowthData(dates)

    // Get real project growth data
    const projectGrowthData = await getProjectGrowthData(dates)

    // Generate simulated revenue and document growth
    const revenueGrowth = generateRevenueGrowth(dates)
    const documentsGrowth = generateDocumentsGrowth(dates)

    return {
        period,
        organizationsGrowth: organizationGrowthData,
        usersGrowth: userGrowthData,
        revenueGrowth,
        projectsGrowth: projectGrowthData,
        documentsGrowth
    }
}

async function getOrganizationGrowthData(dates: string[]) {
    const growthData: GrowthEntry[] = []
    let cumulativeCount = 0

    for (let i = 0; i < dates.length; i++) {
        const date = dates[i]
        const nextDate = i < dates.length - 1 ? dates[i + 1] : new Date().toISOString().split('T')[0]

        // Get organizations created on this date
        const dailyCount = await prisma.organization.count({
            where: {
                createdAt: {
                    gte: new Date(date),
                    lt: new Date(nextDate + 'T23:59:59.999Z')
                }
            }
        })

        cumulativeCount += dailyCount
        const growth = i > 0 ? ((dailyCount / Math.max(1, growthData[i - 1].count)) * 100) : 0

        growthData.push({
            date,
            count: cumulativeCount,
            growth: Math.round(growth * 100) / 100
        })
    }

    return growthData
}

async function getUserGrowthData(dates: string[]) {
    const growthData: GrowthEntry[] = []
    let cumulativeCount = 0

    for (let i = 0; i < dates.length; i++) {
        const date = dates[i]
        const nextDate = i < dates.length - 1 ? dates[i + 1] : new Date().toISOString().split('T')[0]

        // Get users created on this date
        const dailyCount = await prisma.user.count({
            where: {
                createdAt: {
                    gte: new Date(date),
                    lt: new Date(nextDate + 'T23:59:59.999Z')
                }
            }
        })

        cumulativeCount += dailyCount
        const growth = i > 0 ? ((dailyCount / Math.max(1, growthData[i - 1].count)) * 100) : 0

        growthData.push({
            date,
            count: cumulativeCount,
            growth: Math.round(growth * 100) / 100
        })
    }

    return growthData
}

async function getProjectGrowthData(dates: string[]) {
    const growthData: GrowthEntry[] = []
    let cumulativeCount = 0

    for (let i = 0; i < dates.length; i++) {
        const date = dates[i]
        const nextDate = i < dates.length - 1 ? dates[i + 1] : new Date().toISOString().split('T')[0]

        // Get projects created on this date
        const dailyCount = await prisma.project.count({
            where: {
                createdAt: {
                    gte: new Date(date),
                    lt: new Date(nextDate + 'T23:59:59.999Z')
                }
            }
        })

        cumulativeCount += dailyCount
        const growth = i > 0 ? ((dailyCount / Math.max(1, growthData[i - 1].count)) * 100) : 0

        growthData.push({
            date,
            count: cumulativeCount,
            growth: Math.round(growth * 100) / 100
        })
    }

    return growthData
}

function generateRevenueGrowth(dates: string[]) {
    type RevenueGrowth = {
        date: string,
        amount: number,
        growth: number
    }
    const growthData: RevenueGrowth[] = []
    let baseRevenue = 10000 // Starting revenue

    for (let i = 0; i < dates.length; i++) {
        const date = dates[i]
        const dailyGrowth = (Math.random() - 0.4) * 0.05 // -2% to +3% daily growth
        const amount = Math.round(baseRevenue * (1 + dailyGrowth))
        const growth = i > 0 ? (((amount - growthData[i - 1].amount) / growthData[i - 1].amount) * 100) : 0

        growthData.push({
            date,
            amount,
            growth: Math.round(growth * 100) / 100
        })

        baseRevenue = amount
    }

    return growthData
}

function generateDocumentsGrowth(dates: string[]) {
    const growthData: GrowthEntry[] = []
    let cumulativeCount = 5000 // Starting document count

    for (let i = 0; i < dates.length; i++) {
        const date = dates[i]
        const dailyIncrease = Math.floor(Math.random() * 50 + 10) // 10-60 new documents per day
        cumulativeCount += dailyIncrease
        const growth = i > 0 ? (((cumulativeCount - growthData[i - 1].count) / growthData[i - 1].count) * 100) : 0

        growthData.push({
            date,
            count: cumulativeCount,
            growth: Math.round(growth * 100) / 100
        })
    }

    return growthData
}