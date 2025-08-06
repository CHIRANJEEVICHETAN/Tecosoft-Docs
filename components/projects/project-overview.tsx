'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LoadingSpinner } from '@/components/ui/loading'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ProjectMemberRole, DocumentStatus } from '@prisma/client'
import { 
  FolderOpen,
  FileText,
  Users,
  Calendar,
  Globe,
  Lock,
  Plus,
  Eye,
  Edit3,
  TrendingUp,
  Activity,
  AlertCircle
} from 'lucide-react'

interface Project {
  id: string
  name: string
  slug: string
  description?: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
  memberCount: number
  documentCount: number
  recentActivity?: {
    totalDocuments: number
    publishedDocuments: number
    draftDocuments: number
    recentDocuments: Array<{
      id: string
      title: string
      status: DocumentStatus
      updatedAt: string
      author: {
        name?: string
        email: string
        imageUrl?: string
      }
    }>
    activeMembers: Array<{
      id: string
      name?: string
      email: string
      imageUrl?: string
      role: ProjectMemberRole
    }>
  }
}

interface ProjectOverviewProps {
  project: Project
  canEdit?: boolean
  canManageMembers?: boolean
  canCreateDocuments?: boolean
}

export function ProjectOverview({ 
  project, 
  canEdit = false, 
  canManageMembers = false,
  canCreateDocuments = false 
}: ProjectOverviewProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.PUBLISHED:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case DocumentStatus.DRAFT:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case DocumentStatus.ARCHIVED:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getRoleColor = (role: ProjectMemberRole) => {
    switch (role) {
      case ProjectMemberRole.OWNER:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case ProjectMemberRole.ADMIN:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case ProjectMemberRole.MEMBER:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case ProjectMemberRole.VIEWER:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Project Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <FolderOpen className="w-6 h-6 text-primary" />
                <CardTitle className="text-2xl">{project.name}</CardTitle>
                <Badge variant="outline" className="flex items-center gap-1">
                  {project.isPublic ? (
                    <>
                      <Globe className="w-3 h-3" />
                      Public
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      Private
                    </>
                  )}
                </Badge>
              </div>
              
              {project.description && (
                <CardDescription className="text-base leading-relaxed">
                  {project.description}
                </CardDescription>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {canCreateDocuments && (
                <Button asChild>
                  <Link href={`/dashboard/docs/create?projectId=${project.id}`}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Document
                  </Link>
                </Button>
              )}
              
              {canEdit && (
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/projects/${project.id}/settings`}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{project.documentCount}</p>
                <p className="text-sm text-muted-foreground">Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{project.memberCount}</p>
                <p className="text-sm text-muted-foreground">Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {project.recentActivity?.publishedDocuments || 0}
                </p>
                <p className="text-sm text-muted-foreground">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatDate(project.updatedAt).replace(' ago', '')}
                </p>
                <p className="text-sm text-muted-foreground">Last Updated</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2" asChild>
              <Link href={`/dashboard/projects/${project.id}/documents`}>
                <FileText className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">View All Documents</p>
                  <p className="text-sm text-muted-foreground">Browse and manage project documents</p>
                </div>
              </Link>
            </Button>

            {canManageMembers && (
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2" asChild>
                <Link href={`/dashboard/projects/${project.id}/members`}>
                  <Users className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">Manage Members</p>
                    <p className="text-sm text-muted-foreground">Add or remove team members</p>
                  </div>
                </Link>
              </Button>
            )}

            {canCreateDocuments && (
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2" asChild>
                <Link href={`/dashboard/docs/create?projectId=${project.id}`}>
                  <Plus className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">Create Document</p>
                    <p className="text-sm text-muted-foreground">Start writing new documentation</p>
                  </div>
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {project.recentActivity && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Recent Documents
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/projects/${project.id}/documents`}>
                    View All
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.recentActivity.recentDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No documents yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {project.recentActivity.recentDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <Link 
                          href={`/dashboard/docs/${doc.id}`}
                          className="font-medium hover:text-primary transition-colors truncate block"
                        >
                          {doc.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getStatusColor(doc.status)} size="sm">
                            {doc.status.toLowerCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            by {doc.author.name || doc.author.email}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(doc.updatedAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/docs/${doc.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Members
                </span>
                {canManageMembers && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/projects/${project.id}/members`}>
                      Manage
                    </Link>
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.recentActivity.activeMembers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No members yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {project.recentActivity.activeMembers.slice(0, 5).map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={member.imageUrl} />
                          <AvatarFallback className="text-xs">
                            {member.name?.charAt(0) || member.email.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {member.name || member.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <Badge className={getRoleColor(member.role)} size="sm">
                        {member.role.toLowerCase()}
                      </Badge>
                    </div>
                  ))}
                  {project.recentActivity.activeMembers.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      +{project.recentActivity.activeMembers.length - 5} more members
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}