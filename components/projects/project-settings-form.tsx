'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
    Settings,
    AlertCircle,
    CheckCircle,
    Globe,
    Lock,
    Trash2,
    Save,
    AlertTriangle
} from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Project {
    id: string
    name: string
    slug: string
    description?: string
    isPublic: boolean
    createdAt: string
    updatedAt: string
    memberCount?: number
    documentCount?: number
    canEdit?: boolean
    canDelete?: boolean
}

interface ProjectSettingsFormProps {
    project: Project
    onUpdate?: (updatedProject: Project) => void
    onDelete?: () => void
}

export function ProjectSettingsForm({
    project,
    onUpdate,
    onDelete
}: ProjectSettingsFormProps) {
    const [formData, setFormData] = useState({
        name: project.name,
        description: project.description || '',
        slug: project.slug,
        isPublic: project.isPublic
    })
    const [loading, setLoading] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    // Track changes
    const updateFormData = (updates: Partial<typeof formData>) => {
        setFormData(prev => {
            const newData = { ...prev, ...updates }
            const hasChanges =
                newData.name !== project.name ||
                newData.description !== (project.description || '') ||
                newData.slug !== project.slug ||
                newData.isPublic !== project.isPublic

            setHasChanges(hasChanges)
            return newData
        })
    }

    const handleSlugChange = (slug: string) => {
        const cleanSlug = slug
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')

        updateFormData({ slug: cleanSlug })
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
            const response = await fetch(`/api/projects/${project.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to update project')
            }

            setSuccess(true)
            setHasChanges(false)

            // Call update callback
            if (onUpdate) {
                onUpdate(data.data)
            }

            // Hide success message after 3 seconds
            setTimeout(() => setSuccess(false), 3000)

        } catch (err) {
            console.error('Error updating project:', err)
            setError(err instanceof Error ? err.message : 'Failed to update project')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        setDeleteLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/projects/${project.id}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error?.message || 'Failed to delete project')
            }

            // Call delete callback
            if (onDelete) {
                onDelete()
            }

        } catch (err) {
            console.error('Error deleting project:', err)
            setError(err instanceof Error ? err.message : 'Failed to delete project')
        } finally {
            setDeleteLoading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            name: project.name,
            description: project.description || '',
            slug: project.slug,
            isPublic: project.isPublic
        })
        setHasChanges(false)
        setError(null)
        setSuccess(false)
    }

    return (
        <div className="space-y-6">
            {/* General Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        General Settings
                    </CardTitle>
                    <CardDescription>
                        Update your project's basic information and settings
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

                        {success && (
                            <Alert>
                                <CheckCircle className="w-4 h-4" />
                                <AlertDescription>Project settings updated successfully!</AlertDescription>
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
                                onChange={(e) => updateFormData({ name: e.target.value })}
                                disabled={loading || !project.canEdit}
                                required
                            />
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
                                    disabled={loading || !project.canEdit}
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
                                onChange={(e) => updateFormData({ description: e.target.value })}
                                disabled={loading || !project.canEdit}
                                rows={4}
                            />
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
                                    onCheckedChange={(checked) => updateFormData({ isPublic: checked })}
                                    disabled={loading || !project.canEdit}
                                />
                            </div>
                        </div>

                        {/* Project Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium">Members</p>
                                <p className="text-2xl font-bold">{project.memberCount || 0}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium">Documents</p>
                                <p className="text-2xl font-bold">{project.documentCount || 0}</p>
                            </div>
                        </div>

                        {/* Form Actions */}
                        {project.canEdit && (
                            <div className="flex items-center gap-3 pt-4">
                                <Button
                                    type="submit"
                                    disabled={loading || !hasChanges}
                                    className="flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <LoadingSpinner size="sm" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={resetForm}
                                    disabled={loading || !hasChanges}
                                >
                                    Reset
                                </Button>
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            {project.canDelete && (
                <Card className="border-destructive/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="w-5 h-5" />
                            Danger Zone
                        </CardTitle>
                        <CardDescription>
                            Irreversible and destructive actions
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="p-4 border border-destructive/20 rounded-lg">
                                <h4 className="font-medium mb-2">Delete Project</h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Once you delete a project, there is no going back. This will permanently delete
                                    the project, all its documents, and remove all team members.
                                </p>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="destructive"
                                            className="flex items-center gap-2"
                                            disabled={deleteLoading}
                                        >
                                            {deleteLoading ? (
                                                <>
                                                    <LoadingSpinner size="sm" />
                                                    Deleting...
                                                </>
                                            ) : (
                                                <>
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete Project
                                                </>
                                            )}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the
                                                <strong> {project.name} </strong> project and remove all of its data
                                                including documents, members, and settings.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleDelete}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                Yes, delete project
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}