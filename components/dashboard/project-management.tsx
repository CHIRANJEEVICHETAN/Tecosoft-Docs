'use client'

import { useState, useEffect } from 'react'
import { ProjectMemberRole } from '@prisma/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/loading'
import { 
  FolderOpen, 
  Users, 
  Settings, 
  Plus,
  Search,
  Filter,
  Calendar,
  MoreHorizontal,
  UserPlus,
  Edit,
  Trash2,
  Archive,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface Project {
  id: string
  name: string
  slug: string
  description?: string
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT'
  memberCount: number
  members: Array<{
    id: string
    role: string
    user: {
      id: string
      name?: string
      email: string
      imageUrl?: string
    }
  }>
  createdAt: string
  updatedAt: string
}

interface ProjectMember {
  id: string
  role: ProjectMemberRole
  user: {
    id: string
    name?: string
    email: string
    imageUrl?: string
  }
  joinedAt: string
}

interface ProjectManagementProps {
  projects: Project[]
  className?: string
}

export function ProjectManagement({ projects: initialProjects, className }: ProjectManagementProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showMemberDialog, setShowMemberDialog] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(false)

  // Filter projects based on search and status
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.slug.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Fetch project members
  const fetchProjectMembers = async (projectId: string) => {
    try {
      setLoadingMembers(true)
      setError(null)

      const response = await fetch(`/api/projects/${projectId}/members/roles`)
      if (!response.ok) {
        throw new Error('Failed to fetch project members')
      }

      const data = await response.json()
      setProjectMembers(data.data || [])
    } catch (err) {
      console.error('Error fetching project members:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch project members')
    } finally {
      setLoadingMembers(false)
    }
  }

  // Handle project member role update
  const updateMemberRole = async (memberId: string, newRole: ProjectMemberRole) => {
    if (!selectedProject) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/projects/${selectedProject.id}/members/roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: memberId,
          role: newRole
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update member role')
      }

      // Refresh project members
      await fetchProjectMembers(selectedProject.id)
    } catch (err) {
      console.error('Error updating member role:', err)
      setError(err instanceof Error ? err.message : 'Failed to update member role')
    } finally {
      setLoading(false)
    }
  }

  // Handle project member removal
  const removeMember = async (memberId: string) => {
    if (!selectedProject) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/projects/${selectedProject.id}/members/${memberId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to remove member')
      }

      // Refresh project members
      await fetchProjectMembers(selectedProject.id)
    } catch (err) {
      console.error('Error removing member:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setLoading(false)
    }
  }

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default'
      case 'DRAFT': return 'secondary'
      case 'ARCHIVED': return 'outline'
      default: return 'secondary'
    }
  }

  const getProjectStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="w-4 h-4" />
      case 'DRAFT': return <Clock className="w-4 h-4" />
      case 'ARCHIVED': return <Archive className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER': return 'default'
      case 'ADMIN': return 'secondary'
      case 'MEMBER': return 'outline'
      case 'VIEWER': return 'outline'
      default: return 'secondary'
    }
  }

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project)
    fetchProjectMembers(project.id)
    setShowMemberDialog(true)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Project Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage your projects and team members
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getProjectStatusColor(project.status)} className="text-xs">
                      <div className="flex items-center space-x-1">
                        {getProjectStatusIcon(project.status)}
                        <span>{project.status.toLowerCase()}</span>
                      </div>
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
              {project.description && (
                <CardDescription className="text-xs">
                  {project.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Project Stats */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{project.memberCount} members</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Project Slug */}
                <div className="text-xs text-muted-foreground">
                  /{project.slug}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleProjectSelect(project)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Members
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Projects Found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? 'No projects match your current filters.'
              : 'You don\'t have any projects to manage yet.'
            }
          </p>
          {(!searchTerm && statusFilter === 'all') && (
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create First Project
            </Button>
          )}
        </div>
      )}

      {/* Project Members Dialog */}
      <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProject?.name} - Team Members
            </DialogTitle>
            <DialogDescription>
              Manage project members and their roles
            </DialogDescription>
          </DialogHeader>

          {loadingMembers ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add Member Button */}
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Team Members ({projectMembers.length})</h4>
                <Button size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </div>

              {/* Members List */}
              <div className="space-y-3">
                {projectMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        {member.user.name ? member.user.name.charAt(0).toUpperCase() : member.user.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{member.user.name || member.user.email}</p>
                        <p className="text-xs text-muted-foreground">{member.user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Select
                        value={member.role}
                        onValueChange={(newRole) => updateMemberRole(member.user.id, newRole as ProjectMemberRole)}
                        disabled={loading}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OWNER">Owner</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          <SelectItem value="VIEWER">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember(member.user.id)}
                        disabled={loading || member.role === 'OWNER'}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}

                {projectMembers.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Team Members</h3>
                    <p className="text-muted-foreground mb-4">
                      This project doesn't have any team members yet.
                    </p>
                    <Button>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add First Member
                    </Button>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}