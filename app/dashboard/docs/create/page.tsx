import { DashboardLayout, SimpleDashboardHeader } from '@/components/dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileTextIcon, FolderIcon, BrainIcon } from 'lucide-react'

export default function CreateDocumentPage() {
  return (
    <DashboardLayout showBackButton backHref="/dashboard/docs" backLabel="Back to Documents">
      <SimpleDashboardHeader 
        title="Create New Document"
        description="Start writing a new document or generate one with AI assistance"
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main creation form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileTextIcon className="w-5 h-5" />
                Document Details
              </CardTitle>
              <CardDescription>
                Provide basic information about your new document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Document Title</Label>
                <Input 
                  id="title" 
                  placeholder="Enter document title..." 
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea 
                  id="description" 
                  placeholder="Brief description of the document..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project">Project</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project1">Project Alpha</SelectItem>
                      <SelectItem value="project2">Project Beta</SelectItem>
                      <SelectItem value="project3">Project Gamma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guide">Guide</SelectItem>
                      <SelectItem value="tutorial">Tutorial</SelectItem>
                      <SelectItem value="reference">Reference</SelectItem>
                      <SelectItem value="api">API Documentation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button className="flex-1">
                  <FileTextIcon className="w-4 h-4 mr-2" />
                  Create Document
                </Button>
                <Button variant="outline" className="flex-1">
                  <BrainIcon className="w-4 h-4 mr-2" />
                  Generate with AI
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Creation options sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Creation Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <FileTextIcon className="w-5 h-5 text-primary" />
                  <strong>Blank Document</strong>
                </div>
                <p className="text-sm text-muted-foreground">
                  Start with a completely blank document
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <BrainIcon className="w-5 h-5 text-primary" />
                  <strong>AI Generated</strong>
                </div>
                <p className="text-sm text-muted-foreground">
                  Let AI create initial content based on your requirements
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <FolderIcon className="w-5 h-5 text-primary" />
                  <strong>From Template</strong>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use a pre-built template as starting point
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4 text-muted-foreground text-sm">
                No recent documents
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}