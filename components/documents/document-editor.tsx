'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { LoadingSpinner } from '@/components/ui/loading'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DocumentStatus } from '@prisma/client'
import { 
  Save, 
  Eye, 
  Edit3, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  FileText,
  History
} from 'lucide-react'

const updateDocumentSchema = z.object({
  title: z.string().min(1, 'Document title is required').max(200, 'Title too long'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  summary: z.string().max(500, 'Summary too long').optional(),
  content: z.string().optional(),
  status: z.nativeEnum(DocumentStatus),
  changeDescription: z.string().max(200, 'Change description too long').optional()
})

type UpdateDocumentFormData = z.infer<typeof updateDocumentSchema>

interface Document {
  id: string
  title: string
  slug: string
  content?: string
  summary?: string
  status: DocumentStatus
  createdAt: string
  updatedAt: string
  versionCount?: number
  canEdit?: boolean
  canDelete?: boolean
  author: {
    id: string
    name?: string
    email: string
  }
  project: {
    id: string
    name: string
    slug: string
  }
}

interface DocumentEditorProps {
  document: Document
  onSave?: (updatedDocument: Document) => void
  onCancel?: () => void
}

export function DocumentEditor({ document, onSave, onCancel }: DocumentEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [activeTab, setActiveTab] = useState('edit')

  const form = useForm<UpdateDocumentFormData>({
    resolver: zodResolver(updateDocumentSchema),
    defaultValues: {
      title: document.title,
      slug: document.slug,
      summary: document.summary || '',
      content: document.content || '',
      status: document.status,
      changeDescription: ''
    }
  })

  // Track form changes
  const watchedValues = form.watch()
  
  useEffect(() => {
    const hasChanges = 
      watchedValues.title !== document.title ||
      watchedValues.slug !== document.slug ||
      watchedValues.summary !== (document.summary || '') ||
      watchedValues.content !== (document.content || '') ||
      watchedValues.status !== document.status

    setHasUnsavedChanges(hasChanges)
  }, [watchedValues, document])

  // Auto-save functionality (optional)
  const autoSave = useCallback(async () => {
    if (!hasUnsavedChanges || isSubmitting) return

    try {
      const data = form.getValues()
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          changeDescription: 'Auto-save'
        })
      })

      if (response.ok) {
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
      }
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }, [hasUnsavedChanges, isSubmitting, form, document.id])

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(autoSave, 30000)
    return () => clearInterval(interval)
  }, [autoSave])

  const onSubmit = async (data: UpdateDocumentFormData) => {
    try {
      setIsSubmitting(true)
      setError(null)

      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update document')
      }

      const result = await response.json()
      setLastSaved(new Date())
      setHasUnsavedChanges(false)
      
      // Reset change description after successful save
      form.setValue('changeDescription', '')
      
      if (onSave) {
        onSave(result.data)
      }

    } catch (err) {
      console.error('Error updating document:', err)
      setError(err instanceof Error ? err.message : 'Failed to update document')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.PUBLISHED:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case DocumentStatus.DRAFT:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case DocumentStatus.ARCHIVED:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  if (!document.canEdit) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <Edit3 className="w-16 h-16 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Read-Only Document</h3>
          <p className="text-muted-foreground text-center max-w-md">
            You don't have permission to edit this document.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Document Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {document.title}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Project: {document.project.name}</span>
                <Badge className={getStatusColor(document.status)}>
                  {document.status.toLowerCase()}
                </Badge>
                {document.versionCount && (
                  <span className="flex items-center gap-1">
                    <History className="w-3 h-3" />
                    {document.versionCount} versions
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-yellow-600">
                  <Clock className="w-3 h-3 mr-1" />
                  Unsaved changes
                </Badge>
              )}
              {lastSaved && (
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Saved {lastSaved.toLocaleTimeString()}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Editor Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="edit" className="flex items-center gap-2">
            <Edit3 className="w-4 h-4" />
            Edit
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Slug */}
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Slug</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          URL-friendly identifier for this document
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Summary */}
                  <FormField
                    control={form.control}
                    name="summary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Summary</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of the document"
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Content */}
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Write your document content here..."
                            className="min-h-[400px] font-mono"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Supports Markdown formatting
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Status */}
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={DocumentStatus.DRAFT}>Draft</SelectItem>
                            <SelectItem value={DocumentStatus.PUBLISHED}>Published</SelectItem>
                            <SelectItem value={DocumentStatus.ARCHIVED}>Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Change Description */}
                  <FormField
                    control={form.control}
                    name="changeDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Change Description (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Describe what you changed..."
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          This will be saved in the version history
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Error Display */}
                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <span className="text-sm text-destructive">{error}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || !hasUnsavedChanges}
                      className="flex items-center gap-2"
                    >
                      {isSubmitting ? (
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
                    
                    {onCancel && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={onCancel}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <h1>{watchedValues.title}</h1>
                {watchedValues.summary && (
                  <p className="text-lg text-muted-foreground">{watchedValues.summary}</p>
                )}
                <div className="whitespace-pre-wrap">
                  {watchedValues.content || 'No content yet...'}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}