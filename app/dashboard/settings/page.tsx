import { Permission } from '@/lib/middleware/rbac-middleware'
import { PermissionGate } from '@/lib/hooks/use-permissions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Settings, Users, Database, Shield, Bell, Globe } from 'lucide-react'

export default function SettingsPage() {
  return (
    <PermissionGate 
      permissions={[Permission.MANAGE_ORGANIZATION]}
      fallback={
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Admin Access Required
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              You need administrator privileges to access system settings.
            </p>
          </div>
        </div>
      }
    >
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Settings className="h-8 w-8" />
            System Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage organization-wide settings and configurations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Organization Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Organization Settings
              </CardTitle>
              <CardDescription>
                Configure basic organization information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Organization Name</label>
                <Input placeholder="Your Organization" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Domain</label>
                <Input placeholder="yourorg.com" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Time Zone</label>
                <select className="w-full p-2 border rounded-md">
                  <option>UTC</option>
                  <option>EST</option>
                  <option>PST</option>
                </select>
              </div>
              <Button className="w-full">Save Changes</Button>
            </CardContent>
          </Card>

          {/* User Management Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Configure user access and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Allow user registration</span>
                <input type="checkbox" className="rounded" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Require email verification</span>
                <input type="checkbox" className="rounded" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Auto-approve new users</span>
                <input type="checkbox" className="rounded" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Default User Role</label>
                <select className="w-full p-2 border rounded-md">
                  <option>VIEWER</option>
                  <option>USER</option>
                  <option>MANAGER</option>
                </select>
              </div>
              <Button className="w-full">Update Settings</Button>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage security and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Enable MFA</span>
                <Badge variant="secondary">Recommended</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Session timeout (minutes)</span>
                <Input type="number" defaultValue="60" className="w-20" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Password complexity</span>
                <select className="p-2 border rounded-md">
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
              <Button className="w-full">Apply Security Settings</Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure system notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Email notifications</span>
                <input type="checkbox" className="rounded" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Slack integration</span>
                <input type="checkbox" className="rounded" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Activity alerts</span>
                <input type="checkbox" className="rounded" defaultChecked />
              </div>
              <Button className="w-full">Save Preferences</Button>
            </CardContent>
          </Card>

          {/* Database Settings */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database & Performance
              </CardTitle>
              <CardDescription>
                Monitor and configure database settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">98.5%</div>
                  <div className="text-sm text-gray-500">Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">2.3ms</div>
                  <div className="text-sm text-gray-500">Avg Response</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">1.2GB</div>
                  <div className="text-sm text-gray-500">Storage Used</div>
                </div>
              </div>
              <div className="flex gap-4">
                <Button variant="outline">View Logs</Button>
                <Button variant="outline">Backup Data</Button>
                <Button variant="outline">Optimize Performance</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PermissionGate>
  )
}
