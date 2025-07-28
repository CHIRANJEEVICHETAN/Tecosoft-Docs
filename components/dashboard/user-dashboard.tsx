'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RecentDocuments } from './recent-documents'
import { ProjectAccess } from './project-access'
import { DocumentSearch } from './document-search'
import { 
  FileTextIcon, 
  FolderIcon, 
  SearchIcon,
  PlusIcon,
  BookOpenIcon
} from 'lucide-react'
import Link from 'next/link'

interface UserDashboardProps {
  organizationId?: string
}

export function UserDashboard({ organizationId }: UserDashboardProps) {
  const { user } = useUser()
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUserOrganization() {
      if (!user) return

      try {
        // If organizationId is provided, use it
        if (organizationId) {
          setCurrentOrgId(organizationId)
          setLoading(false)
          return
        }

        // Otherwise, fetch from user metadata or API
        const orgId = user.publicMetadata?.organizationId as string
        if (orgId) {
          setCurrentOrgId(orgId)
        } else {
          // Fallback: fetch from API
          const response = await fetch('/api/user/organization')
          if (response.ok) {
            const data = await response.json()
            setCurrentOrgId(data.organizationId)
          }
        }
      } catch (error) {
        console.error('Error fetching organization:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserOrganization()
  }, [user, organizationId])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-64 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!currentOrgId || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <BookOpenIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Welcome to Your Dashboard</h2>
          <p className="text-muted-foreground mb-6">
            Unable to load your organization data. Please try refreshing the page.
          </p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user.firstName || user.fullName || 'User'}!
        </h1>
        <p className="text-muted-foreground">
          Access your documents, projects, and collaborate with your team.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileTextIcon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Create Document</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Start writing a new document
                </p>
                <Button size="sm" asChild>
                  <Link href="/dashboard/docs/create">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    New Document
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <FolderIcon className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Browse Projects</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Explore all your projects
                </p>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/projects">
                    View Projects
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <SearchIcon className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Search Docs</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Find any document quickly
                </p>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/search">
                    Search All
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          <RecentDocuments 
            organizationId={currentOrgId} 
            userId={user.id} 
          />
          
          <ProjectAccess 
            organizationId={currentOrgId} 
            userId={user.id} 
          />
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          <DocumentSearch 
            organizationId={currentOrgId} 
            userId={user.id} 
          />
        </div>
      </div>
    </div>
  )
}