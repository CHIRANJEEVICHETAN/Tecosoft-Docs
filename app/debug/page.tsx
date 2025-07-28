'use client'

import { useUser } from '@clerk/nextjs'
import { useUserRole, clearUserRoleCache } from '@/lib/hooks/use-user-role'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'

export default function DebugPage() {
  const { user, isLoaded } = useUser()
  const { userRole, loading, error, refetch } = useUserRole()
  const [syncResult, setSyncResult] = useState<string>('')
  const [updateResult, setUpdateResult] = useState<string>('')
  const [debugResult, setDebugResult] = useState<string>('')
  const [authResult, setAuthResult] = useState<string>('')

  const handleSyncUser = async () => {
    try {
      const response = await fetch('/api/user/sync', {
        method: 'POST'
      })
      const data = await response.json()
      setSyncResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setSyncResult(`Error: ${error}`)
    }
  }

  const handleUpdateClerkId = async () => {
    try {
      const email = user?.emailAddresses[0]?.emailAddress
      if (!email) {
        setUpdateResult('No email found')
        return
      }

      const response = await fetch('/api/user/update-clerk-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })
      const data = await response.json()
      setUpdateResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setUpdateResult(`Error: ${error}`)
    }
  }

  const handleDebugUser = async () => {
    try {
      const response = await fetch('/api/debug/user')
      const data = await response.json()
      setDebugResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setDebugResult(`Error: ${error}`)
    }
  }

  const handleRefreshRole = async () => {
    clearUserRoleCache(user?.id)
    await refetch()
  }

  const handleTestAuth = async () => {
    try {
      const response = await fetch('/api/debug/auth')
      const data = await response.json()
      setAuthResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setAuthResult(`Error: ${error}`)
    }
  }

  if (!isLoaded) {
    return <div>Loading Clerk...</div>
  }

  if (!user) {
    return <div>Not signed in</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Debug Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Clerk User Info</CardTitle>
            <CardDescription>Information from Clerk</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-4 rounded overflow-auto">
              {JSON.stringify({
                id: user.id,
                email: user.emailAddresses[0]?.emailAddress,
                firstName: user.firstName,
                lastName: user.lastName,
                imageUrl: user.imageUrl
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database User Role</CardTitle>
            <CardDescription>Role information from database</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading role...</div>
            ) : error ? (
              <div className="text-red-500">Error: {error.message}</div>
            ) : userRole ? (
              <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                {JSON.stringify(userRole, null, 2)}
              </pre>
            ) : (
              <div>No role data</div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>User Sync</CardTitle>
            <CardDescription>Sync current user to database or update existing user</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <Button onClick={handleSyncUser}>
                Create New User
              </Button>
              <Button onClick={handleUpdateClerkId} variant="outline">
                Update Existing User ({user?.emailAddresses[0]?.emailAddress})
              </Button>
              <Button onClick={handleDebugUser} variant="secondary">
                Debug Database
              </Button>
              <Button onClick={handleRefreshRole} variant="destructive">
                Refresh Role Cache
              </Button>
              <Button onClick={handleTestAuth} variant="default">
                Test Auth
              </Button>
            </div>
            {syncResult && (
              <div>
                <h4 className="font-medium mb-2">Create User Result:</h4>
                <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                  {syncResult}
                </pre>
              </div>
            )}
            {updateResult && (
              <div>
                <h4 className="font-medium mb-2">Update User Result:</h4>
                <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                  {updateResult}
                </pre>
              </div>
            )}
            {debugResult && (
              <div>
                <h4 className="font-medium mb-2">Debug Database Result:</h4>
                <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                  {debugResult}
                </pre>
              </div>
            )}
            {authResult && (
              <div>
                <h4 className="font-medium mb-2">Auth Test Result:</h4>
                <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                  {authResult}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}