'use client'

import { useState, useEffect } from 'react'
import { ProjectMemberRole } from '@prisma/client'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, UserPlus, Settings, Shield, Trash2 } from 'lucide-react'
import { useProjectPermissions } from '@/lib/hooks/use-permissions'
import { Permission } from '@/lib/middleware/rbac-middleware'

interface ProjectMemberWithUser {
  id: string
  userId: string
  projectId: string
  role: ProjectMemberRole
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface ProjectRolesManagerProps {
  projectId: string
}

const roleColors = {
  [ProjectMemberRole.OWNER]: 'bg-red-100 text-red-800',
  [ProjectMemberRole.ADMIN]: 'bg-purple-100 text-purple-800',
  [ProjectMemberRole.MEMBER]: 'bg-blue-100 text-blue-800',
  [ProjectMemberRole.VIEWER]: 'bg-gray-100 text-gray-800',
}

const roleLabels = {
  [ProjectMemberRole.OWNER]: 'Owner',
  [ProjectMemberRole.ADMIN]: 'Admin',
  [ProjectMemberRole.MEMBER]: 'Member',
  [ProjectMemberRole.VIEWER]: 'Viewer',
}

export default function ProjectRolesManager({ projectId }: ProjectRolesManagerProps) {
  const { user } = useUser()
  const { hasPermissions, loading: permissionsLoading } = useProjectPermissions(
    projectId,
    [Permission.VIEW_PROJECT_MEMBERS]
  )
  const { hasPermissions: canManage } = useProjectPermissions(
    projectId,
    [Permission.MANAGE_PROJECT_MEMBERS]
  )
  
  const [members, setMembers] = useState<ProjectMemberWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<ProjectMemberRole | ''>('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Dialog states
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<ProjectMemberWithUser | null>(null)
  const [newRole, setNewRole] = useState<ProjectMemberRole>(ProjectMemberRole.MEMBER)
  const [updating, setUpdating] = useState(false)
  
  // Add member states
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<ProjectMemberRole>(ProjectMemberRole.MEMBER)
  const [adding, setAdding] = useState(false)

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(selectedRole && { role: selectedRole }),
      })

      const response = await fetch(`/api/projects/${projectId}/members/roles?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch project members')
      }

      const data = await response.json()
      setMembers(data.members)
      setTotalPages(data.pages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [page, searchTerm, selectedRole, projectId])

  const handleRoleChange = async () => {
    if (!selectedMember || !newRole) return

    try {
      setUpdating(true)
      const response = await fetch(`/api/projects/${projectId}/members/roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedMember.userId,
          role: newRole,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update role')
      }

      // Refresh the members list
      await fetchMembers()
      setIsRoleDialogOpen(false)
      setSelectedMember(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setUpdating(false)
    }
  }

  const handleAddMember = async () => {
    if (!newMemberEmail || !newMemberRole) return

    try {
      setAdding(true)
      const response = await fetch(`/api/projects/${projectId}/members/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newMemberEmail,
          role: newMemberRole,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add member')
      }

      // Refresh the members list
      await fetchMembers()
      setIsAddMemberDialogOpen(false)
      setNewMemberEmail('')
      setNewMemberRole(ProjectMemberRole.MEMBER)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveMember = async (member: ProjectMemberWithUser) => {
    if (!confirm(`Are you sure you want to remove ${member.user.name || member.user.email} from this project?`)) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/members/roles`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: member.userId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove member')
      }

      // Refresh the members list
      await fetchMembers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  const openRoleDialog = (member: ProjectMemberWithUser) => {
    setSelectedMember(member)
    setNewRole(member.role)
    setIsRoleDialogOpen(true)
  }

  const getRoleOptions = (isForNewMember = false) => {
    // Filter roles based on current user's permissions
    const allRoles = Object.values(ProjectMemberRole)
    
    // This would depend on your business logic
    // For now, allowing all roles except OWNER for non-owners
    return allRoles.filter(role => {
      if (role === ProjectMemberRole.OWNER && !isForNewMember) {
        // Only existing owners can assign OWNER role to others
        return false
      }
      return true
    })
  }

  const canModifyMember = (member: ProjectMemberWithUser) => {
    // Users cannot modify themselves
    if (member.user.id === user?.id) return false
    
    // Additional business logic for role hierarchy would go here
    return canManage
  }

  if (permissionsLoading) {
    return <div className="flex justify-center py-8">Loading permissions...</div>
  }

  if (!hasPermissions) {
    return (
      <div className="text-center py-8">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have permission to view project members.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Project Members</h2>
        {canManage && (
          <Button onClick={() => setIsAddMemberDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        )}
      </div>

      {/* Search and Filter Controls */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value as ProjectMemberRole | '')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Roles</SelectItem>
            {Object.values(ProjectMemberRole).map((role) => (
              <SelectItem key={role} value={role}>
                {roleLabels[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-white shadow rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              {canManage && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={canManage ? 4 : 3} className="text-center py-8">
                  Loading members...
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 4 : 3} className="text-center py-8">
                  No members found.
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>
                          {member.user.name 
                            ? member.user.name.charAt(0).toUpperCase() 
                            : member.user.email.charAt(0).toUpperCase()
                          }
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {member.user.name || 'Unnamed User'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{member.user.email}</TableCell>
                  <TableCell>
                    <Badge className={roleColors[member.role]}>
                      {roleLabels[member.role]}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRoleDialog(member)}
                          disabled={!canModifyMember(member)}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Change Role
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveMember(member)}
                          disabled={!canModifyMember(member) || member.role === ProjectMemberRole.OWNER}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="py-2 px-4 text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Role Change Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Member Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedMember?.user.name || selectedMember?.user.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Role
            </label>
            <Select value={newRole} onValueChange={(value: any) => setNewRole(value as ProjectMemberRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {getRoleOptions().map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleLabels[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRoleDialogOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={updating || newRole === selectedMember?.role}
            >
              {updating ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Project Member</DialogTitle>
            <DialogDescription>
              Add a new member to this project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="Enter email address"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <Select value={newMemberRole} onValueChange={(value: any) => setNewMemberRole(value as ProjectMemberRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {getRoleOptions(true).map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabels[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddMemberDialogOpen(false)}
              disabled={adding}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={adding || !newMemberEmail}
            >
              {adding ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
