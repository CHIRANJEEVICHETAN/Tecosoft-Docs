'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ProjectMemberRole } from '@prisma/client'
import { 
  Users, 
  UserPlus, 
  Search, 
  MoreHorizontal,
  Crown,
  Shield,
  User,
  Eye,
  Trash2,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ProjectMember {
  id: string
  userId: string
  role: ProjectMemberRole
  joinedAt: string
  user: {
    id: string
    name?: string
    email: string
    imageUrl?: string
  }
}

interface ProjectMemberManagementProps {
  projectId: string
  projectName: string
  canManageMembers?: boolean
  currentUserId?: string
}

export function ProjectMemberManagement({ 
  projectId, 
  projectName, 
  canManageMembers = false,
  currentUserId 
}: ProjectMemberManagementProps) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [addMemberEmail, setAddMemberEmail] = useState('')
  const [addMemberRole, setAddMemberRole] = useState<ProjectMemberRole>(ProjectMemberRole.MEMBER)
  const [addMemberLoading, setAddMemberLoading] = useState(false)
  const [addMemberError, setAddMemberError] = useState<string | null>(null)
  const [addMemberSuccess, setAddMemberSuccess] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(null)

  useEffect(() => {
    fetchMembers()
  }, [projectId])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/projects/${projectId}/members`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch project members')
      }
      
      const data = await response.json()
      setMembers(data.data || [])
    } catch (err) {
      console.error('Error fetching members:', err)
      setError(err instanceof Error ? err.message : 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!addMemberEmail.trim()) {
      setAddMemberError('Email is required')
      return
    }

    setAddMemberLoading(true)
    setAddMemberError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: addMemberEmail.trim(),
          role: addMemberRole
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to add member')
      }

      setAddMemberSuccess(true)
      setAddMemberEmail('')
      setAddMemberRole(ProjectMemberRole.MEMBER)
      
      // Refresh members list
      await fetchMembers()

      // Hide success message and close dialog after 2 seconds
      setTimeout(() => {
        setAddMemberSuccess(false)
        setShowAddDialog(false)
      }, 2000)

    } catch (err) {
      console.error('Error adding member:', err)
      setAddMemberError(err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setAddMemberLoading(false)
    }
  }

  const handleUpdateMemberRole = async (memberId: string, newRole: ProjectMemberRole) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Failed to update member role')
      }

      // Update local state
      setMembers(prev => prev.map(member => 
        member.id === memberId 
          ? { ...member, role: newRole }
          : member
      ))

    } catch (err) {
      console.error('Error updating member role:', err)
      setError(err instanceof Error ? err.message : 'Failed to update member role')
    }
  }

  const handleRemoveMember = async (member: ProjectMember) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${member.userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Failed to remove member')
      }

      // Update local state
      setMembers(prev => prev.filter(m => m.id !== member.id))
      setMemberToRemove(null)

    } catch (err) {
      console.error('Error removing member:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  const getRoleIcon = (role: ProjectMemberRole) => {
    switch (role) {
      case ProjectMemberRole.OWNER:
        return <Crown className="w-4 h-4 text-yellow-500" />
      case ProjectMemberRole.ADMIN:
        return <Shield className="w-4 h-4 text-blue-500" />
      case ProjectMemberRole.MEMBER:
        return <User className="w-4 h-4 text-green-500" />
      case ProjectMemberRole.VIEWER:
        return <Eye className="w-4 h-4 text-gray-500" />
      default:
        return <User className="w-4 h-4" />
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

  const canModifyMember = (member: ProjectMember) => {
    return canManageMembers && 
           member.userId !== currentUserId && 
           member.role !== ProjectMemberRole.OWNER
  }

  const filteredMembers = members.filter(member =>
    searchQuery === '' ||
    member.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Project Members
              </CardTitle>
              <CardDescription>
                Manage who has access to {projectName}
              </CardDescription>
            </div>
            
            {canManageMembers && (
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Project Member</DialogTitle>
                    <DialogDescription>
                      Invite a team member to join this project
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {addMemberError && (
                      <Alert variant="destructive">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>{addMemberError}</AlertDescription>
                      </Alert>
                    )}

                    {addMemberSuccess && (
                      <Alert>
                        <CheckCircle className="w-4 h-4" />
                        <AlertDescription>Member added successfully!</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email Address</label>
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        value={addMemberEmail}
                        onChange={(e) => setAddMemberEmail(e.target.value)}
                        disabled={addMemberLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Role</label>
                      <Select 
                        value={addMemberRole} 
                        onValueChange={(value) => setAddMemberRole(value as ProjectMemberRole)}
                        disabled={addMemberLoading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ProjectMemberRole.ADMIN}>Admin</SelectItem>
                          <SelectItem value={ProjectMemberRole.MEMBER}>Member</SelectItem>
                          <SelectItem value={ProjectMemberRole.VIEWER}>Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAddDialog(false)}
                      disabled={addMemberLoading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddMember}
                      disabled={addMemberLoading}
                    >
                      {addMemberLoading ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Adding...
                        </>
                      ) : (
                        'Add Member'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Members List */}
      <Card>
        <CardContent className="pt-6">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No members found' : 'No members yet'}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? 'Try adjusting your search terms.'
                  : 'Add team members to start collaborating on this project.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.user.imageUrl} />
                      <AvatarFallback>
                        {member.user.name?.charAt(0) || member.user.email.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <p className="font-medium">
                        {member.user.name || member.user.email}
                        {member.userId === currentUserId && (
                          <span className="text-sm text-muted-foreground ml-2">(You)</span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={getRoleColor(member.role)}>
                      <div className="flex items-center gap-1">
                        {getRoleIcon(member.role)}
                        {member.role.toLowerCase()}
                      </div>
                    </Badge>

                    {canModifyMember(member) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleUpdateMemberRole(member.id, ProjectMemberRole.ADMIN)}
                            disabled={member.role === ProjectMemberRole.ADMIN}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleUpdateMemberRole(member.id, ProjectMemberRole.MEMBER)}
                            disabled={member.role === ProjectMemberRole.MEMBER}
                          >
                            <User className="w-4 h-4 mr-2" />
                            Make Member
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleUpdateMemberRole(member.id, ProjectMemberRole.VIEWER)}
                            disabled={member.role === ProjectMemberRole.VIEWER}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Make Viewer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setMemberToRemove(member)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{memberToRemove?.user.name || memberToRemove?.user.email}</strong> from this project? 
              They will lose access to all project documents and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && handleRemoveMember(memberToRemove)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}