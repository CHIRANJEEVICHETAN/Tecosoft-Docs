import { DashboardLayout, SimpleDashboardHeader } from '@/components/dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { FolderIcon, UsersIcon, SettingsIcon } from 'lucide-react'

export default function CreateProjectPage() {
  return (
    <DashboardLayout showBackButton backHref="/dashboard/projects" backLabel="Back to Projects">
      <SimpleDashboardHeader 
        title="Create New Project"
        description="Set up a new project to organize your documentation and collaborate with your team"
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main creation form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderIcon className="w-5 h-5" />
                Project Details
              </CardTitle>
              <CardDescription>
                Provide basic information about your new project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input 
                  id="name" 
                  placeholder="Enter project name..." 
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Project Slug</Label>
                <Input 
                  id="slug" 
                  placeholder="project-slug" 
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  This will be used in URLs. Only lowercase letters, numbers, and hyphens allowed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Brief description of the project..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template">Template</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blank">Blank Project</SelectItem>
                      <SelectItem value="documentation">Documentation</SelectItem>
                      <SelectItem value="api">API Documentation</SelectItem>
                      <SelectItem value="knowledge-base">Knowledge Base</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Project Settings</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Comments</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow team members to comment on documents
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Version Control</Label>
                    <p className="text-sm text-muted-foreground">
                      Track changes and enable document versioning
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>AI Assistance</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable AI-powered content generation and editing
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button className="flex-1">
                  <FolderIcon className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
                <Button variant="outline">
                  Save as Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project setup sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <FolderIcon className="w-5 h-5 text-primary" />
                  <strong>1. Basic Info</strong>
                </div>
                <p className="text-sm text-muted-foreground">
                  Set up project name, description, and basic settings
                </p>
              </div>

              <div className="p-4 border rounded-lg opacity-50">
                <div className="flex items-center gap-3 mb-2">
                  <UsersIcon className="w-5 h-5 text-muted-foreground" />
                  <strong>2. Team Members</strong>
                </div>
                <p className="text-sm text-muted-foreground">
                  Invite team members and assign roles
                </p>
              </div>

              <div className="p-4 border rounded-lg opacity-50">
                <div className="flex items-center gap-3 mb-2">
                  <SettingsIcon className="w-5 h-5 text-muted-foreground" />
                  <strong>3. Configuration</strong>
                </div>
                <p className="text-sm text-muted-foreground">
                  Configure project settings and permissions
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <strong>Documentation:</strong> Perfect for product docs, user guides
              </div>
              <div>
                <strong>API:</strong> Structured for API reference documentation
              </div>
              <div>
                <strong>Knowledge Base:</strong> Great for internal wikis and FAQs
              </div>
              <div>
                <strong>Blank:</strong> Start from scratch with complete flexibility
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}