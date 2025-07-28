'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Role } from '@prisma/client'
import { useUserRole } from '@/lib/hooks/use-user-role'
import { LoadingSpinner } from '@/components/ui/loading'
import { AlertCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export interface DashboardRouterProps {
    /**
     * Optional fallback URL if role-based routing fails
     */
    fallbackUrl?: string
    /**
     * Whether to show loading state while determining role
     */
    showLoading?: boolean
    /**
     * Custom error message for invalid roles
     */
    errorMessage?: string
}

/**
 * Maps user roles to their corresponding dashboard paths
 */
export function getDashboardPathByRole(role: Role): string {
    switch (role) {
        case Role.SUPER_ADMIN:
            return '/admin/dashboard'
        case Role.ORG_ADMIN:
            return '/dashboard/organization'
        case Role.MANAGER:
            return '/dashboard/projects'
        case Role.USER:
            return '/dashboard/docs'
        case Role.VIEWER:
            return '/dashboard/browse'
        default:
            // Fallback to user dashboard for unknown roles
            return '/dashboard/docs'
    }
}

/**
 * Validates if a role has access to dashboard features
 */
function isValidDashboardRole(role: Role): boolean {
    return Object.values(Role).includes(role)
}

/**
 * DashboardRouter component that redirects users based on their role
 * 
 * This component should be used on the main /dashboard route to automatically
 * redirect users to their role-appropriate dashboard.
 */
export function DashboardRouter({
    fallbackUrl = '/dashboard/docs',
    showLoading = true,
    errorMessage = 'Unable to determine your dashboard access. Please contact support if this issue persists.'
}: DashboardRouterProps) {
    const router = useRouter()
    const { userRole, loading, error } = useUserRole()

    useEffect(() => {
        // Don't redirect if still loading or if there's an error
        if (loading || error) {
            return
        }

        // If no user role is available, redirect to fallback
        if (!userRole) {
            console.warn('DashboardRouter: No user role available, redirecting to fallback')
            router.replace(fallbackUrl)
            return
        }

        // Validate the role
        if (!isValidDashboardRole(userRole.role)) {
            console.error('DashboardRouter: Invalid role detected:', userRole.role)
            router.replace(fallbackUrl)
            return
        }

        // Get the appropriate dashboard path for the user's role
        const dashboardPath = getDashboardPathByRole(userRole.role)

        // Only redirect if we're currently on the generic dashboard route
        if (window.location.pathname === '/dashboard') {
            console.log(`DashboardRouter: Redirecting ${userRole.role} to ${dashboardPath}`)
            router.replace(dashboardPath)
        }
    }, [userRole, loading, error, router, fallbackUrl])

    // Show loading state while determining role
    if (loading && showLoading) {
        return <DashboardRouterLoading />
    }

    // Show error state if there's an error fetching user role
    if (error) {
        return (
            <DashboardRouterError
                error={error}
                errorMessage={errorMessage}
                fallbackUrl={fallbackUrl}
            />
        )
    }

    // Show error state if no user role is available
    if (!userRole) {
        return (
            <DashboardRouterError
                error={new Error('No user role available')}
                errorMessage="Unable to access dashboard. Please ensure you are properly authenticated."
                fallbackUrl={fallbackUrl}
            />
        )
    }

    // Show error state for invalid roles
    if (!isValidDashboardRole(userRole.role)) {
        return (
            <DashboardRouterError
                error={new Error(`Invalid role: ${userRole.role}`)}
                errorMessage="Your account role is not recognized. Please contact support."
                fallbackUrl={fallbackUrl}
            />
        )
    }

    // If we reach here, the redirect should be happening
    // Show a brief loading state while the redirect occurs
    return <DashboardRouterLoading message="Redirecting to your dashboard..." />
}

/**
 * Loading component for DashboardRouter
 */
function DashboardRouterLoading({ message = "Loading your dashboard..." }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
    )
}

/**
 * Error component for DashboardRouter
 */
function DashboardRouterError({
    error,
    errorMessage,
    fallbackUrl
}: {
    error: Error
    errorMessage: string
    fallbackUrl: string
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 p-6 text-center">
            <AlertCircleIcon className="w-12 h-12 text-destructive" />
            <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Dashboard Access Error</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                    {errorMessage}
                </p>
                {process.env.NODE_ENV === 'development' && (
                    <details className="mt-4 text-xs text-muted-foreground">
                        <summary className="cursor-pointer hover:text-foreground">
                            Debug Info (Development Only)
                        </summary>
                        <div className="mt-2 p-2 bg-muted rounded text-left">
                            <p><strong>Error:</strong> {error.message}</p>
                            <p><strong>Fallback URL:</strong> {fallbackUrl}</p>
                        </div>
                    </details>
                )}
            </div>
            <div className="flex gap-2">
                <Button variant="outline" asChild>
                    <Link href={fallbackUrl}>Go to Dashboard</Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/">Return Home</Link>
                </Button>
            </div>
        </div>
    )
}

/**
 * Hook to get the dashboard path for the current user
 */
export function useDashboardPath() {
    const { userRole, loading, error } = useUserRole()

    const dashboardPath = userRole ? getDashboardPathByRole(userRole.role) : null

    return {
        dashboardPath,
        loading,
        error,
        userRole
    }
}

/**
 * Utility function to check if a user can access a specific dashboard
 */
export function canAccessDashboard(userRole: Role, dashboardPath: string): boolean {
    const allowedPath = getDashboardPathByRole(userRole)
    return dashboardPath === allowedPath || userRole === Role.SUPER_ADMIN
}

/**
 * Get all available dashboard paths for a role (useful for navigation)
 */
export function getAvailableDashboardPaths(role: Role): string[] {
    const paths: string[] = []

    // Super admin can access all dashboards
    if (role === Role.SUPER_ADMIN) {
        return [
            '/admin/dashboard',
            '/dashboard/organization',
            '/dashboard/projects',
            '/dashboard/docs',
            '/dashboard/browse'
        ]
    }

    // Org admin can access organization and lower-level dashboards
    if (role === Role.ORG_ADMIN) {
        return [
            '/dashboard/organization',
            '/dashboard/projects',
            '/dashboard/docs',
            '/dashboard/browse'
        ]
    }

    // Manager can access project and lower-level dashboards
    if (role === Role.MANAGER) {
        return [
            '/dashboard/projects',
            '/dashboard/docs',
            '/dashboard/browse'
        ]
    }

    // User can access docs and browse dashboards
    if (role === Role.USER) {
        return [
            '/dashboard/docs',
            '/dashboard/browse'
        ]
    }

    // Viewer can only access browse dashboard
    if (role === Role.VIEWER) {
        return ['/dashboard/browse']
    }

    return paths
}

/**
 * Check if current path matches user's primary dashboard
 */
export function isUserPrimaryDashboard(userRole: Role, currentPath: string): boolean {
    const primaryPath = getDashboardPathByRole(userRole)
    return currentPath === primaryPath
}