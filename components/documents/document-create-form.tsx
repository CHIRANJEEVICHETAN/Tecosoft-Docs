'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { LoadingSpinner } from '@/components/ui/loading'
import { DocumentStatus } from '@prisma/client'
import { FileText, AlertTriangle } from 'lucide-react'

const createDocumentSchema = z.object({
  title: z.string().min(1, 'Document title is required').max(200, 'Title too long'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  summary: z.string().max(500, 'Summary too long').optional(),
  content: z.string().optional(),
  status: z.nativeEnum(DocumentStatus).default(DocumentStatus.DRAFT),
  projectId: z.string().min(1, 'Project is required')
})

type CreateDocumentFormData = z.infer<typeof createDocumentSchema>

interface Project {
  id: string
  name: string
  slug: string
}

interface DocumentCreateFormProps {
  projects: Project[]
  defaultProjectId?: string
  onSuccess?: (document: any) => void
  onCancel?: () => void
}

export function DocumentCreateForm({ 
  projects, 
  defaultProjectId, 
  onSuccess, 
  onCancel 
}: DocumentCreateFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<CreateDocumentFormData>({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: {
      title: '',
      slug: '',
      summary: '',
      content: '',
      status: DocumentStatus.DRAFT,
      projectId: defaultProjectId || ''
    }
  })

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
    
    form.setValue('slug', slug)
  }

  const onSubmit = async (data: CreateDocumentFormData) => {
    try {
      setIsSubmitting(true)
      setError(null)

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create document')
      }

      const result = await response.json()
      
      if (onSuccess) {
        onSuccess(result.data)
      } else {
        // Navigate to the created document
        router.push(`/dashboard/docs/${result.data.id}`)
      }

    } catch (err) {
      console.error('Error creating document:', err)
      setError(err instanceof Error ? err.message : 'Failed to create document')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Create New Document
        </CardTitle>
        <CardDescription>
          Create a new document in your selected project
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Project Selection */}
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the project where this document will be created
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter document title"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e)
                        handleTitleChange(e.target.value)
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive title for your document
                  </FormDescription>
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
                    <Input 
                      placeholder="document-url-slug"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    URL-friendly identifier (auto-generated from title)
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
                  <FormLabel>Summary (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of the document content"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A brief summary that will be shown in document listings
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Initial Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Content (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Start writing your document content here..."
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    You can add content now or edit it later in the document editor
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={DocumentStatus.DRAFT}>Draft</SelectItem>
                      <SelectItem value={DocumentStatus.PUBLISHED}>Published</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Draft documents are only visible to project members
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
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Document'
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
  )
}