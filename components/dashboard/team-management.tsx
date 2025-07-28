'use client'

import { useState, useEffect } from 'react'
import { Role } from '@prisma/client'
import { useUserRoleCheck } from '@/lib/hooks/use-user-role'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LoadingSpinner } from '@/components/ui/loading'
import { 
  Users,
  UserPlus,
  Mail,
  MoreVertical,
  Shield,
  UserCheck,
  UserX,
  Crown,
  Eye,
  Settings,
  AlertTriangle,
  CheckCircle,
  Send,
  Copy
} from 'lucide-react'

interface TeamMember {
  id: string
  name?: string
  email: string
  role: Role
  imageUrl?: string
  createdAt: string
  lastActive?: string
  status: 'active' | 'pending' | 'suspended'
}

interface InviteData {
  email: string
  role: Role
  message?: string
}

interface TeamManagementProps {
  className?: string
}

export function TeamManagement({ className }: TeamManagementProps) {
  const { isOrgAdmin, loading: roleLoading } = useUserRoleCheck()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>(Role.USER)
  const [inviteMessage, setInviteMessage] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role | 'all'>('all')

  // Fetch team members
  useEffect(() => {
    if (!isOrgAdmin || roleLoading) return

    const fetchTeamMembers = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/organization/team')
        if (!response.ok) {
          throw new Error('Failed to fetch team members')
        }

        const data = await response.json()
        const membersWithStatus = data.data.map((member: any) => ({
          ...member,
          status: 'active', // Mock status
          lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        }))
        
        setTeamMembers(membersWithStatus)
      } catch (err) {
        console.error('Error fetching team members:', err)
        setError(err instanceof Error ? err.message : 'Failed to load team members')
      } finally {
        setLoading(false)
      }
    }

    fetchTeamMembers()
  }, [isOrgAdmin, roleLoading])

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      setError('Email is required')
      return
    }

    if (!isValidEmail(inviteEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setIsInviting(true)
    setError(null)

    try {
      const inviteData: InviteData = {
        email: inviteEmail.trim(),
        role: inviteRole,
        message: inviteMessage.trim()
      }

      const response = await fetch('/api/organization/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inviteData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send invitation')
      }

      const data = await response.json()
      
      // Add pending member to the list
      const pendingMember: TeamMember = {
        id: `pending_${Date.now()}`,
        email: inviteEmail,
        role: inviteRole,
        createdAt: new Date().toISOString(),
        status: 'pending'
      }
      
      setTeamMembers(prev => [pendingMember, ...prev])
      
      // Reset form
      setInviteEmail('')
      setInviteRole(Role.USER)
      setInviteMessage('')
      setIsInviteDialogOpen(false)

    } catch (err) {
      console.error('Error inviting team member:', err)
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setIsInviting(false)
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: Role) => {
    try {
      const response = await fetch(`/api/organization/team/${memberId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update role')
      }

      // Update local state
      setTeamMembers(prev => 
        prev.map(member => 
          member.id === memberId 
            ? { ...member, role: newRole }
            : member
        )
      )

    } catch (err) {
      console.error('Error updating member role:', err)
      setError(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/organization/team/${memberId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove member')
      }

      // Remove from local state
      setTeamMembers(prev => prev.filter(member => member.id !== memberId))

    } catch (err) {
      console.error('Error removing team member:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  const handleResendInvite = async (email: string) => {
    try {
      const response = await fetch('/api/organization/team/invite/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to resend invitation')
      }

      // Could show a success message here

    } catch (err) {
      console.error('Error resending invitation:', err)
      setError(err instanceof Error ? err.message : 'Failed to resend invitation')
    }
  }

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case Role.ORG_ADMIN: return <Crown className="w-4 h-4" />
      case Role.MANAGER: return <Shield className="w-4 h-4" />
      case Role.USER: return <UserCheck className="w-4 h-4" />
      case Role.VIEWER: return <Eye className="w-4 h-4" />
      default: return <UserCheck className="w-4 h-4" />
    }
  }

  const getRoleColor = (role: Role) => {
    switch (role) {
      case Role.ORG_ADMIN: return 'default'
      case Role.MANAGER: return 'secondary'
      case Role.USER: return 'outline'
      case Role.VIEWER: return 'outline'
      default: return 'secondary'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600'
      case 'pending': return 'text-yellow-600'
      case 'suspended': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />
      case 'pending': return <Mail className="w-4 h-4" />
      case 'suspended': return <AlertTriangle className="w-4 h-4" />
      default: return <UserCheck className="w-4 h-4" />
    }
  }

  // Filter team members
  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = !searchTerm || 
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = selectedRole === 'all' || member.role === selectedRole
    
    return matchesSearch && matchesRole
  })

  // Access denied for non-org admins
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isOrgAdmin) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <Users className="w-16 h-16 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Team Management Access Restricted</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Team management features are only available to Organization Administrators.
          </p>
        </CardContent>
      </Card>
    )
  }

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
    <div className={`space-y-6 ${className}`}>
      {/* Header with Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Management
              </CardTitle>
              <CardDescription>
                Manage your organization's team members, roles, and permissions
              </CardDescription>
            </div>
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your organization
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Role
                    </label>
                    <select 
                      value={inviteRole} 
                      onChange={(e) => setInviteRole(e.target.value as Role)}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value={Role.VIEWER}>Viewer - Read-only access</option>
                      <option value={Role.USER}>User - Can edit documents</option>
                      <option value={Role.MANAGER}>Manager - Can manage projects</option>
                      <option value={Role.ORG_ADMIN}>Organization Admin - Full access</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Personal Message (Optional)
                    </label>
                    <textarea
                      placeholder="Welcome to our team! Looking forward to working with you."
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background min-h-[80px] resize-y"
                    />
                  </div>
                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <span className="text-sm text-destructive">{error}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleInviteMember} 
                      disabled={isInviting}
                      className="flex-1"
                    >
                      {isInviting ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Invitation
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsInviteDialogOpen(false)}
                      disabled={isInviting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              value={selectedRole} 
              onChange={(e) => setSelectedRole(e.target.value as Role | 'all')}
              className="p-2 border rounded-md bg-background min-w-[150px]"
            >
              <option value="all">All Roles</option>
              <option value={Role.ORG_ADMIN}>Organization Admin</option>
              <option value={Role.MANAGER}>Manager</option>
              <option value={Role.USER}>User</option>
              <option value={Role.VIEWER}>Viewer</option>
            </select>
          </div>

          {/* Team Members List */}
          <div className="space-y-3">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No team members found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || selectedRole !== 'all' 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Invite your first team member to get started.'
                  }
                </p>
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{member.name || member.email}</p>
                        <div className={`flex items-center gap-1 ${getStatusColor(member.status)}`}>
                          {getStatusIcon(member.status)}
                          <span className="text-xs capitalize">{member.status}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                      {member.lastActive && member.status === 'active' && (
                        <p className="text-xs text-muted-foreground">
                          Last active: {new Date(member.lastActive).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge variant={getRoleColor(member.role)} className="flex items-center gap-1">
                      {getRoleIcon(member.role)}
                      {member.role.toLowerCase().replace('_', ' ')}
                    </Badge>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.status === 'pending' ? (
                          <>
                            <DropdownMenuItem onClick={() => handleResendInvite(member.email)}>
                              <Mail className="w-4 h-4 mr-2" />
                              Resend Invitation
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-destructive"
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Cancel Invitation
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => handleUpdateRole(member.id, Role.ORG_ADMIN)}>
                              <Crown className="w-4 h-4 mr-2" />
                              Make Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateRole(member.id, Role.MANAGER)}>
                              <Shield className="w-4 h-4 mr-2" />
                              Make Manager
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateRole(member.id, Role.USER)}>
                              <UserCheck className="w-4 h-4 mr-2" />
                              Make User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateRole(member.id, Role.VIEWER)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Make Viewer
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-destructive"
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Remove Member
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Team Statistics</CardTitle>
          <CardDescription>
            Overview of your team composition and activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{teamMembers.length}</div>
              <div className="text-sm text-muted-foreground">Total Members</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {teamMembers.filter(m => m.status === 'active').length}
              </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {teamMembers.filter(m => m.status === 'pending').length}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {teamMembers.filter(m => m.role === Role.ORG_ADMIN).length}
              </div>
              <div className="text-sm text-muted-foreground">Admins</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}