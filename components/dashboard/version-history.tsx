'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/loading'
import { 
  History,
  RotateCcw,
  User,
  Calendar,
  FileText,
  Plus,
  Minus,
  Edit,
  AlertTriangle
} from 'lucide-react'

interface DocumentVersion {
  id: string
  version: number
  title: string
  content: string
  summary?: string
  authorId: string
  changeDescription?: string
  createdAt: string
  author?: {
    id: string
    name: string
    email: string
    imageUrl?: string
  }
  diff?: {
    additions: string[]
    deletions: string[]
    modifications: Array<{
      line: number
      old: string
      new: string
    }>
  }
}

interface VersionHistoryProps {
  documentId: string
  className?: string
}

export function VersionHistory({ documentId, className }: VersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null)
  const [isRollbackDialogOpen, setIsRollbackDialogOpen] = useState(false)
  const [rollingBack, setRollingBack] = useState(false)

  useEffect(() => {
    fetchVersions()
  }, [documentId])

  const fetchVersions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/documents/${documentId}/versions`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch version history')
      }
      
      const data = await response.json()
      setVersions(data.data || [])
    } catch (err) {
      console.error('Error fetching versions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load version history')
    } finally {
      setLoading(false)
    }
  }

  const handleRollback = async (version: number) => {
    try {
      setRollingBack(true)
      
      const response = await fetch(`/api/documents/${documentId}/rollback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ version })
      })

      if (!response.ok) {
        throw new Error('Failed to rollback document')
      }

      // Refresh versions after rollback
      await fetchVersions()
      setIsRollbackDialogOpen(false)
      setSelectedVersion(null)
    } catch (err) {
      console.error('Error rolling back:', err)
      setError(err instanceof Error ? err.message : 'Failed to rollback document')
    } finally {
      setRollingBack(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24)
      return `${days}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Version History
          </CardTitle>
          <CardDescription>
            Track changes and rollback to previous versions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchVersions}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Version History
        </CardTitle>
        <CardDescription>
          Track changes and rollback to previous versions ({versions.length} versions)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No version history available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {versions.map((version, index) => (
              <div
                key={version.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={index === 0 ? 'default' : 'secondary'}>
                      v{version.version}
                    </Badge>
                    {index === 0 && (
                      <Badge variant="outline" className="text-green-600">
                        Current
                      </Badge>
                    )}
                    <h4 className="font-medium truncate">{version.title}</h4>
                  </div>
                  
                  {version.changeDescription && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {version.changeDescription}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{version.author?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(version.createdAt)}</span>
                    </div>
                  </div>

                  {/* Show diff summary if available */}
                  {version.diff && (
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      {version.diff.additions.length > 0 && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Plus className="w-3 h-3" />
                          <span>{version.diff.additions.length} additions</span>
                        </div>
                      )}
                      {version.diff.deletions.length > 0 && (
                        <div className="flex items-center gap-1 text-red-600">
                          <Minus className="w-3 h-3" />
                          <span>{version.diff.deletions.length} deletions</span>
                        </div>
                      )}
                      {version.diff.modifications.length > 0 && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <Edit className="w-3 h-3" />
                          <span>{version.diff.modifications.length} modifications</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Version {version.version}: {version.title}</DialogTitle>
                        <DialogDescription>
                          Created {formatDate(version.createdAt)} by {version.author?.name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="mt-4">
                        <div className="prose prose-sm max-w-none">
                          <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded">
                            {version.content}
                          </pre>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {index > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedVersion(version)
                        setIsRollbackDialogOpen(true)
                      }}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Rollback
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Rollback Confirmation Dialog */}
      <Dialog open={isRollbackDialogOpen} onOpenChange={setIsRollbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Rollback</DialogTitle>
            <DialogDescription>
              Are you sure you want to rollback to version {selectedVersion?.version}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedVersion && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">{selectedVersion.title}</h4>
                <p className="text-sm text-muted-foreground">
                  Created {formatDate(selectedVersion.createdAt)} by {selectedVersion.author?.name}
                </p>
                {selectedVersion.changeDescription && (
                  <p className="text-sm mt-2">{selectedVersion.changeDescription}</p>
                )}
              </div>
            )}
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Important:</p>
                  <p className="text-yellow-700">
                    This will create a new version with the content from version {selectedVersion?.version}. 
                    The current version will be preserved in the history.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsRollbackDialogOpen(false)}
                disabled={rollingBack}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedVersion && handleRollback(selectedVersion.version)}
                disabled={rollingBack}
                className="flex-1"
              >
                {rollingBack ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Rolling back...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Confirm Rollback
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}