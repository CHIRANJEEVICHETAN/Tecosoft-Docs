'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { LoadingSpinner } from '@/components/ui/loading'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, AlertCircle } from 'lucide-react'

// Simplified types to avoid Prisma dependency issues
type Role = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'MANAGER' | 'USER' | 'VIEWER'
type ProjectMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

interface RoleAwareLayoutProps {
  children: React.ReactNode
  projectId?: string
  showSidebar?: boolean
  variant?: 'docs' | 'dashboard' | 'project'
}

export function RoleAwareLayout({ 
  children, 
  projectId, 
  showSidebar = true,
  variant = 'docs'
}: RoleAwareLayoutProps) {
  const { user, isLoaded } = useUser()
  const [userRole, setUserRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return

    setLoading(true)
    
    if (user?.publicMetadata?.role) {
      setUserRole(user.publicMetadata.role as Role)
    } else {
      setUserRole(null)
    }
    
    setLoading(false)
  }, [user, isLoaded])

  const getMainClassName = () => {
    const baseClasses = "flex-1 transition-all duration-200"
    
    if (!showSidebar) {
      return `${baseClasses} w-full`
    }

    if (variant === 'dashboard') {
      return `${baseClasses} p-6`
    }

    if (variant === 'project') {
      return `${baseClasses} p-4`
    }

    // Default docs layout
    return `${baseClasses} sm:container mx-auto w-[90vw] h-auto scroll-smooth`
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-[50vh]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Authentication Required
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Please sign in to access this content.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!userRole) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-[50vh]">
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your account is not assigned a role. Please contact an administrator.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <main className={getMainClassName()}>
          <RoleContextProvider 
            userRole={userRole} 
            projectRole={null}
            projectId={projectId}
          >
            {children}
          </RoleContextProvider>
        </main>
      </div>
    </div>
  )
}

// Context to provide role information to child components
import React, { createContext, useContext } from 'react'

interface RoleContextType {
  userRole: Role
  projectRole?: ProjectMemberRole | null
  projectId?: string
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

function RoleContextProvider({ 
  children, 
  userRole, 
  projectRole, 
  projectId 
}: RoleContextType & { children: React.ReactNode }) {
  return (
    <RoleContext.Provider value={{ userRole, projectRole, projectId }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRoleContext() {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRoleContext must be used within a RoleContextProvider')
  }
  return context
}
