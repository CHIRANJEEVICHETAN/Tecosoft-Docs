'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'

export default function TestRolePage() {
  const { user } = useUser()
  const [roleData, setRoleData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRole() {
      try {
        const response = await fetch('/api/user/role')
        const data = await response.json()
        
        if (response.ok) {
          setRoleData(data.data)
        } else {
          setError(data.error || 'Failed to fetch role')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchRole()
    }
  }, [user])

  if (!user) {
    return <div>Please sign in</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Role Test Page</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Clerk User</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify({
              id: user.id,
              email: user.emailAddresses[0]?.emailAddress,
              firstName: user.firstName,
              lastName: user.lastName
            }, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Database Role</h2>
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-red-500">Error: {error}</div>
          ) : (
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(roleData, null, 2)}
            </pre>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Expected Redirect</h2>
          <p>
            {roleData?.role === 'SUPER_ADMIN' && 'Should redirect to: /admin/dashboard'}
            {roleData?.role === 'ORG_ADMIN' && 'Should redirect to: /dashboard/organization'}
            {roleData?.role === 'MANAGER' && 'Should redirect to: /dashboard/projects'}
            {roleData?.role === 'USER' && 'Should redirect to: /dashboard/docs'}
            {roleData?.role === 'VIEWER' && 'Should redirect to: /dashboard/browse'}
          </p>
        </div>
      </div>
    </div>
  )
}