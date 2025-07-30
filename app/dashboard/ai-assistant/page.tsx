import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BrainCircuitIcon, SparklesIcon, FileTextIcon, EditIcon } from 'lucide-react'
import { SimpleDashboardHeader } from '@/components/dashboard'

export default function AIAssistantPage() {
  return (
    <>
      <SimpleDashboardHeader
        title="AI Assistant"
        description="Leverage AI-powered tools to create, improve, and optimize your documentation"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-primary" />
              Generate Content
            </CardTitle>
            <CardDescription>
              Create new documentation from scratch using AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              Start Generating
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <EditIcon className="w-5 h-5 text-primary" />
              Improve Content
            </CardTitle>
            <CardDescription>
              Enhance existing documentation with AI suggestions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Improve Text
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileTextIcon className="w-5 h-5 text-primary" />
              Summarize
            </CardTitle>
            <CardDescription>
              Create summaries and abstracts from long content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Summarize
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent AI Generations</CardTitle>
          <CardDescription>
            Your recent AI-powered content generations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BrainCircuitIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No AI generations yet. Start creating content with AI!</p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}