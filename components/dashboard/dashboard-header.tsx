'use client'

import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { ThemedUserButton } from '@/components/themed-user-button'
import { ModeToggle } from '@/components/theme-toggle'
import { DashboardNavigation } from './dashboard-navigation'
import { Button } from '@/components/ui/button'
import { FileTextIcon, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardHeaderProps {
  className?: string
  showBackButton?: boolean
  backHref?: string
  backLabel?: string
}

export function DashboardHeader({ 
  className, 
  showBackButton = false, 
  backHref = '/dashboard',
  backLabel = 'Back to Dashboard'
}: DashboardHeaderProps) {
  const { user } = useUser()

  return (
    <header className={cn(
      'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
      className
    )}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center space-x-6">
            {/* Back Button (if needed) */}
            {showBackButton && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={backHref} className="flex items-center space-x-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">{backLabel}</span>
                </Link>
              </Button>
            )}

            {/* Logo */}
            <Link href="/dashboard" className="flex items-center space-x-2">
              <FileTextIcon className="w-6 h-6 text-primary" strokeWidth={2} />
              <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Docify.ai Pro
              </h2>
            </Link>

            {/* Dashboard Navigation */}
            <DashboardNavigation />
          </div>

          {/* Right side - User controls */}
          <div className="flex items-center space-x-3">
            {/* Welcome message (desktop only) */}
            {user && (
              <div className="hidden md:block text-sm text-muted-foreground">
                Welcome, {user.firstName || user.fullName || 'User'}
              </div>
            )}

            {/* Theme toggle */}
            <ModeToggle />

            {/* User button */}
            <ThemedUserButton />
          </div>
        </div>
      </div>
    </header>
  )
}

// Simplified header for specific dashboard pages
interface SimpleDashboardHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function SimpleDashboardHeader({ 
  title, 
  description, 
  actions,
  className 
}: SimpleDashboardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-8', className)}>
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center space-x-2">
          {actions}
        </div>
      )}
    </div>
  )
}