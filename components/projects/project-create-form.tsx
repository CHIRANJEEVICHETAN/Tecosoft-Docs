'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading'
import { Switch } from '@/components/ui/switch'
import { 
  FolderPlus, 
  AlertCircle, 
  CheckCircle,
  Globe,
  Lock
} from 'lucide-react'

interface ProjectCreateFormProps {
  organizationId: string
  organizationName: string
  onSuccess?: (project: any) => void
  onCancel?: () => void
}

export function ProjectCreateForm({ 
  organizationId, 
  organizationName, 
  onSuccess, 
  onCancel 
}: ProjectCreateFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: '',
    isPublic: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
    }))
  }

  const handleSlugChange = (slug: string) => {
    const cleanSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
    
    setFormData(prev => ({ ...prev, slug: cleanSlug }))
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Project name is required')
      return false
    }
    
    if (formData.name.length < 3) {
      setError('Project name must be at least 3 characters')
      return false
    }
    
    if (!formData.slug.trim()) {
      setError('Project slug is required')
      return false
    }
    
    if (formData.slug.length < 3) {
      setError('Project slug must be at least 3 characters')
      return false
    }
    
    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      setError('Project slug can only contain lowercase letters, numbers, and hyphens')
      return false
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          organizationId
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create project')
      }
      
      setSuccess(true)
      
      // Call success callback or redirect
      if (onSuccess) {
        onSuccess(data.data)
      } else {
        setTimeout(() => {
          router.push(`/dashboard/projects/${data.data.id}`)
        }, 1500)
      }
      
    } catch (err) {
      console.error('Error creating project:', err)
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500" />
          <h3 className="text-lg font-semibold">Project Created Successfully!</h3>
          <p className="text-muted-foreground text-center">
            Your new project "{formData.name}" has been created and you'll be redirected shortly.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderPlus className="w-5 h-5" />
          Create New Project
        </CardTitle>
        <CardDescription>
          Create a new project in {organizationName} to organize your documentation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter project name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={loading}
              required
            />
            <p className="text-xs text-muted-foreground">
              A descriptive name for your project
            </p>
          </div>

          {/* Project Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">Project URL Slug *</Label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                /projects/
              </span>
              <Input
                id="slug"
                type="text"
                placeholder="project-slug"
                value={formData.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              URL-friendly identifier (lowercase letters, numbers, and hyphens only)
            </p>
          </div>

          {/* Project Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this project is about..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={loading}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Optional description to help team members understand the project's purpose
            </p>
          </div>

          {/* Visibility Settings */}
          <div className="space-y-4">
            <Label>Project Visibility</Label>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                {formData.isPublic ? (
                  <Globe className="w-5 h-5 text-blue-500" />
                ) : (
                  <Lock className="w-5 h-5 text-gray-500" />
                )}
                <div>
                  <p className="font-medium">
                    {formData.isPublic ? 'Public Project' : 'Private Project'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formData.isPublic 
                      ? 'Anyone in your organization can view this project'
                      : 'Only invited members can access this project'
                    }
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.isPublic}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, isPublic: checked }))
                }
                disabled={loading}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Creating...
                </>
              ) : (
                <>
                  <FolderPlus className="w-4 h-4" />
                  Create Project
                </>
              )}
            </Button>
            
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}