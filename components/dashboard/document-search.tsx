'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  SearchIcon, 
  FileTextIcon, 
  FolderIcon, 
  UserIcon,
  CalendarIcon,
  ExternalLinkIcon,
  FilterIcon,
  SortAscIcon,
  SortDescIcon
} from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { debounce } from 'lodash'

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
  createdAt: string
  updatedAt: string
}

interface DocumentSearchProps {
  organizationId: string
  userId: string
}

type SortField = 'title' | 'updatedAt' | 'createdAt' | 'project'
type SortOrder = 'asc' | 'desc'

export function DocumentSearch({ organizationId, userId }: DocumentSearchProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('updatedAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [projects, setProjects] = useState<Array<{ id: string; name: string; slug: string }>>([])

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string, status: string, project: string) => {
      if (!query.trim() && status === 'all' && project === 'all') {
        setDocuments([])
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        const params = new URLSearchParams({
          organizationId,
          ...(query.trim() && { q: query.trim() }),
          ...(status !== 'all' && { status }),
          ...(project !== 'all' && { projectId: project }),
          sortBy: sortField,
          sortOrder
        })
        
        const response = await fetch(`/api/user/documents/search?${params}`)
        
        if (!response.ok) {
          throw new Error('Failed to search documents')
        }
        
        const data = await response.json()
        setDocuments(data.documents || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setDocuments([])
      } finally {
        setLoading(false)
      }
    }, 300),
    [organizationId, sortField, sortOrder]
  )

  // Fetch available projects for filtering
  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch(`/api/user/projects?organizationId=${organizationId}`)
        if (response.ok) {
          const data = await response.json()
          setProjects(data.projects || [])
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err)
      }
    }

    fetchProjects()
  }, [organizationId])

  // Trigger search when filters change
  useEffect(() => {
    debouncedSearch(searchQuery, statusFilter, projectFilter)
  }, [searchQuery, statusFilter, projectFilter, debouncedSearch])

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? <SortAscIcon className="w-4 h-4" /> : <SortDescIcon className="w-4 h-4" />
  }

  const hasActiveFilters = searchQuery.trim() || statusFilter !== 'all' || projectFilter !== 'all'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SearchIcon className="w-5 h-5" />
          Document Search
        </CardTitle>
        <CardDescription>
          Search and filter documents across all your projects
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search and Filter Controls */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search documents by title or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {/* Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FilterIcon className="w-4 h-4 mr-2" />
                  Status: {statusFilter === 'all' ? 'All' : statusFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                  All Status
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('published')}>
                  Published
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('draft')}>
                  Draft
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('archived')}>
                  Archived
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Project Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FolderIcon className="w-4 h-4 mr-2" />
                  Project: {projectFilter === 'all' ? 'All' : projects.find(p => p.id === projectFilter)?.name || 'Unknown'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setProjectFilter('all')}>
                  All Projects
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {projects.map((project) => (
                  <DropdownMenuItem 
                    key={project.id} 
                    onClick={() => setProjectFilter(project.id)}
                  >
                    {project.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {getSortIcon(sortField)}
                  Sort: {sortField === 'updatedAt' ? 'Updated' : sortField === 'createdAt' ? 'Created' : sortField}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleSort('updatedAt')}>
                  Last Updated {getSortIcon('updatedAt')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('createdAt')}>
                  Date Created {getSortIcon('createdAt')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('title')}>
                  Title {getSortIcon('title')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('project')}>
                  Project {getSortIcon('project')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button 
              variant="outline" 
              onClick={() => debouncedSearch(searchQuery, statusFilter, projectFilter)}
            >
              Try Again
            </Button>
          </div>
        ) : !hasActiveFilters ? (
          <div className="text-center py-8">
            <SearchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Start typing to search documents or use filters above
            </p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8">
            <FileTextIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No documents found matching your search criteria
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Found {documents.length} document{documents.length !== 1 ? 's' : ''}
            </div>
            
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
                      <UserIcon className="w-3 h-3" />
                      <span>{doc.author.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" />
                      <span>Updated {formatDate(doc.updatedAt)}</span>
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}