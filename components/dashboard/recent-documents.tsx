'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileTextIcon, ClockIcon, FolderIcon, ExternalLinkIcon } from 'lucide-react'
import Link from 'next/link'

interface Document {
  id: string
  title: string
  slug: string
  summary?: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  project: {
    id: string
    name: string
    slug: string
  }
  author: {
    id: string
    name: string
    imageUrl?: string
  }
  updatedAt: string
}

interface RecentDocumentsProps {
  organizationId: string
  userId: string
}

export function RecentDocuments({ organizationId, userId }: RecentDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRecentDocuments() {
      try {
        setLoading(true)
        const response = await fetch(`/api/user/documents/recent?organizationId=${organizationId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch recent documents')
        }
        
        const data = await response.json()
        setDocuments(data.documents || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchRecentDocuments()
  }, [organizationId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24)
      return `${days}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileTextIcon className="w-5 h-5" />
            Recent Documents
          </CardTitle>
          <CardDescription>
            Documents you've recently accessed or modified
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileTextIcon className="w-5 h-5" />
            Recent Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileTextIcon className="w-5 h-5" />
          Recent Documents
        </CardTitle>
        <CardDescription>
          Documents you've recently accessed or modified
        </CardDescription>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileTextIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No recent documents found</p>
            <Button variant="outline" asChild>
              <Link href="/dashboard/docs/create">
                Create Your First Document
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium truncate">{doc.title}</h3>
                    <Badge 
                      variant="secondary" 
                      className={getStatusColor(doc.status)}
                    >
                      {doc.status.toLowerCase()}
                    </Badge>
                  </div>
                  
                  {doc.summary && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {doc.summary}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FolderIcon className="w-3 h-3" />
                      <span>{doc.project.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-3 h-3" />
                      <span>{formatDate(doc.updatedAt)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/org/${organizationId}/projects/${doc.project.slug}/docs/${doc.slug}`}>
                      <ExternalLinkIcon className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
            
            {documents.length >= 5 && (
              <div className="text-center pt-4">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/docs">
                    View All Documents
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}