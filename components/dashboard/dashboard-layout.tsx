'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from './dashboard-header'
import { LoadingSpinner } from '@/components/ui/loading'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
  className?: string
  showBackButton?: boolean
  backHref?: string
  backLabel?: string
}

export function DashboardLayout({ 
  children, 
  className,
  showBackButton,
  backHref,
  backLabel
}: DashboardLayoutProps) {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in')
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isSignedIn) {
    return null // Will redirect to sign-in
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        showBackButton={showBackButton}
        backHref={backHref}
        backLabel={backLabel}
      />
      <main className={cn('container mx-auto px-4 py-8', className)}>
        {children}
      </main>
    </div>
  )
}

// Specialized layout for full-width dashboard pages
export function FullWidthDashboardLayout({ 
  children, 
  className,
  showBackButton,
  backHref,
  backLabel
}: DashboardLayoutProps) {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in')
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isSignedIn) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        showBackButton={showBackButton}
        backHref={backHref}
        backLabel={backLabel}
      />
      <main className={cn('py-8', className)}>
        {children}
      </main>
    </div>
  )
}