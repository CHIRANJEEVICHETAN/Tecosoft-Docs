'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@clerk/nextjs'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  clerkId: string | null
  organizationId: string | null
}

export default function AdminUsersPage() {
  const { user } = useUser()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [updateResult, setUpdateResult] = useState<string>('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateClerkId = async (email: string, clerkId: string) => {
    try {
      const response = await fetch('/api/admin/update-user-clerk-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, clerkId })
      })
      
      const data = await response.json()
      setUpdateResult(JSON.stringify(data, null, 2))
      
      if (response.ok) {
        fetchUsers() // Refresh the list
      }
    } catch (error) {
      setUpdateResult(`Error: ${error}`)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'ORG_ADMIN':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'USER':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'VIEWER':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (loading) {
    return <div>Loading users...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">User Management</h1>
        <p className="text-muted-foreground">
          Manage user Clerk IDs and roles (SUPER_ADMIN only)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Users in the system with their current Clerk ID status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.map((dbUser) => (
                <div key={dbUser.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{dbUser.name || dbUser.email}</h3>
                      <Badge className={getRoleColor(dbUser.role)}>
                        {dbUser.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Email: {dbUser.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Clerk ID: {dbUser.clerkId || 'Not set'}
                    </p>
                    {dbUser.organizationId && (
                      <p className="text-sm text-muted-foreground">
                        Organization: {dbUser.organizationId}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!dbUser.clerkId && user?.id && (
                      <Button
                        size="sm"
                        onClick={() => updateClerkId(dbUser.email, user.id)}
                      >
                        Set My Clerk ID
                      </Button>
                    )}
                    {dbUser.clerkId && (
                      <Badge variant="outline" className="text-green-600">
                        ✓ Linked
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {updateResult && (
          <Card>
            <CardHeader>
              <CardTitle>Update Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                {updateResult}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}