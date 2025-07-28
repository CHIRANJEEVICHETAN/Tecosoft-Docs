'use client'

import { useState, useEffect, useRef } from 'react'
import { useUserRoleCheck } from '@/lib/hooks/use-user-role'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/ui/loading'
import { 
  Brain,
  Send,
  Sparkles,
  FileText,
  Edit3,
  Zap,
  AlertCircle,
  CheckCircle,
  Copy,
  Download,
  RefreshCw,
  Settings,
  Lightbulb,
  MessageSquare
} from 'lucide-react'

interface AIUsageStats {
  monthlyUsage: number
  usageLimit: number
  remainingCredits: number
  resetDate: string
}

interface AIGenerationRequest {
  type: 'generate' | 'improve' | 'summarize' | 'translate'
  prompt: string
  content?: string
  options?: {
    tone?: 'professional' | 'casual' | 'technical' | 'friendly'
    length?: 'short' | 'medium' | 'long'
    format?: 'paragraph' | 'bullet-points' | 'outline'
  }
}

interface AIGenerationResponse {
  id: string
  content: string
  usage: number
  timestamp: string
  type: string
}

interface AIAssistantInterfaceProps {
  className?: string
}

export function AIAssistantInterface({ className }: AIAssistantInterfaceProps) {
  const { isOrgAdmin, loading: roleLoading } = useUserRoleCheck()
  const [activeTab, setActiveTab] = useState('generate')
  const [prompt, setPrompt] = useState('')
  const [content, setContent] = useState('')
  const [generatedContent, setGeneratedContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [usageStats, setUsageStats] = useState<AIUsageStats | null>(null)
  const [recentGenerations, setRecentGenerations] = useState<AIGenerationResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedTone, setSelectedTone] = useState<'professional' | 'casual' | 'technical' | 'friendly'>('professional')
  const [selectedLength, setSelectedLength] = useState<'short' | 'medium' | 'long'>('medium')
  const [selectedFormat, setSelectedFormat] = useState<'paragraph' | 'bullet-points' | 'outline'>('paragraph')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch AI usage stats
  useEffect(() => {
    if (!isOrgAdmin || roleLoading) return

    const fetchUsageStats = async () => {
      try {
        const response = await fetch('/api/organization/ai-usage')
        if (!response.ok) {
          throw new Error('Failed to fetch AI usage stats')
        }
        const data = await response.json()
        setUsageStats({
          monthlyUsage: data.data.monthlyUsage,
          usageLimit: data.data.usageLimit,
          remainingCredits: data.data.remainingCredits,
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Mock reset date
        })
      } catch (err) {
        console.error('Error fetching AI usage stats:', err)
      }
    }

    fetchUsageStats()
  }, [isOrgAdmin, roleLoading])

  // Fetch recent generations
  useEffect(() => {
    if (!isOrgAdmin || roleLoading) return

    const fetchRecentGenerations = async () => {
      try {
        const response = await fetch('/api/ai/generations/recent')
        if (response.ok) {
          const data = await response.json()
          setRecentGenerations(data.data || [])
        }
      } catch (err) {
        console.error('Error fetching recent generations:', err)
      }
    }

    fetchRecentGenerations()
  }, [isOrgAdmin, roleLoading])

  const handleGenerate = async (type: AIGenerationRequest['type']) => {
    if (!prompt.trim() && type === 'generate') {
      setError('Please enter a prompt for content generation')
      return
    }

    if (!content.trim() && (type === 'improve' || type === 'summarize')) {
      setError('Please enter content to process')
      return
    }

    if (!usageStats || usageStats.remainingCredits <= 0) {
      setError('You have reached your monthly AI usage limit')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const requestData: AIGenerationRequest = {
        type,
        prompt: prompt.trim(),
        content: content.trim(),
        options: {
          tone: selectedTone,
          length: selectedLength,
          format: selectedFormat
        }
      }

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate content')
      }

      const data = await response.json()
      setGeneratedContent(data.data.content)
      
      // Update usage stats
      if (usageStats) {
        setUsageStats({
          ...usageStats,
          monthlyUsage: usageStats.monthlyUsage + data.data.usage,
          remainingCredits: usageStats.remainingCredits - data.data.usage
        })
      }

      // Add to recent generations
      const newGeneration: AIGenerationResponse = {
        id: data.data.id,
        content: data.data.content,
        usage: data.data.usage,
        timestamp: new Date().toISOString(),
        type
      }
      setRecentGenerations(prev => [newGeneration, ...prev.slice(0, 9)])

    } catch (err) {
      console.error('Error generating content:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate content')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const insertIntoContent = (text: string) => {
    setContent(prev => prev + (prev ? '\n\n' : '') + text)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  // Access denied for non-org admins
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isOrgAdmin) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <Brain className="w-16 h-16 text-muted-foreground" />
          <h3 className="text-lg font-semibold">AI Assistant Access Restricted</h3>
          <p className="text-muted-foreground text-center max-w-md">
            AI-powered content generation is only available to Organization Administrators.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Usage Stats Header */}
      {usageStats && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">AI Usage This Month</CardTitle>
                <CardDescription>
                  Track your AI content generation usage and limits
                </CardDescription>
              </div>
              <Badge variant={usageStats.remainingCredits > 100 ? 'default' : 'destructive'}>
                {usageStats.remainingCredits} credits remaining
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span>Usage: {usageStats.monthlyUsage} / {usageStats.usageLimit}</span>
                  <span>{Math.round((usageStats.monthlyUsage / usageStats.usageLimit) * 100)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      usageStats.monthlyUsage / usageStats.usageLimit > 0.8 
                        ? 'bg-destructive' 
                        : usageStats.monthlyUsage / usageStats.usageLimit > 0.6 
                        ? 'bg-yellow-500' 
                        : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min((usageStats.monthlyUsage / usageStats.usageLimit) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Resets {new Date(usageStats.resetDate).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main AI Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Content Assistant
          </CardTitle>
          <CardDescription>
            Generate, improve, and optimize your documentation content with AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="generate" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Generate
              </TabsTrigger>
              <TabsTrigger value="improve" className="flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Improve
              </TabsTrigger>
              <TabsTrigger value="summarize" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Summarize
              </TabsTrigger>
              <TabsTrigger value="translate" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Translate
              </TabsTrigger>
            </TabsList>

            {/* Content Generation Tab */}
            <TabsContent value="generate" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    What would you like to generate?
                  </label>
                  <Input
                    placeholder="e.g., Write a user guide for API authentication..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Generation Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Tone</label>
                    <select 
                      value={selectedTone} 
                      onChange={(e) => setSelectedTone(e.target.value as any)}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="technical">Technical</option>
                      <option value="friendly">Friendly</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Length</label>
                    <select 
                      value={selectedLength} 
                      onChange={(e) => setSelectedLength(e.target.value as any)}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value="short">Short</option>
                      <option value="medium">Medium</option>
                      <option value="long">Long</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Format</label>
                    <select 
                      value={selectedFormat} 
                      onChange={(e) => setSelectedFormat(e.target.value as any)}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value="paragraph">Paragraph</option>
                      <option value="bullet-points">Bullet Points</option>
                      <option value="outline">Outline</option>
                    </select>
                  </div>
                </div>

                <Button 
                  onClick={() => handleGenerate('generate')} 
                  disabled={isGenerating || !prompt.trim() || (usageStats?.remainingCredits || 0) <= 0}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Content Improvement Tab */}
            <TabsContent value="improve" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Content to improve
                  </label>
                  <textarea
                    ref={textareaRef}
                    placeholder="Paste your content here to get AI-powered improvements..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full p-3 border rounded-md bg-background min-h-[120px] resize-y"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Improvement instructions (optional)
                  </label>
                  <Input
                    placeholder="e.g., Make it more concise, add examples, improve clarity..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full"
                  />
                </div>

                <Button 
                  onClick={() => handleGenerate('improve')} 
                  disabled={isGenerating || !content.trim() || (usageStats?.remainingCredits || 0) <= 0}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Improving...
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Improve Content
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Content Summarization Tab */}
            <TabsContent value="summarize" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Content to summarize
                  </label>
                  <textarea
                    placeholder="Paste your long-form content here to get a concise summary..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full p-3 border rounded-md bg-background min-h-[120px] resize-y"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Summary Length</label>
                    <select 
                      value={selectedLength} 
                      onChange={(e) => setSelectedLength(e.target.value as any)}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value="short">Brief Summary</option>
                      <option value="medium">Detailed Summary</option>
                      <option value="long">Comprehensive Summary</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Format</label>
                    <select 
                      value={selectedFormat} 
                      onChange={(e) => setSelectedFormat(e.target.value as any)}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value="paragraph">Paragraph</option>
                      <option value="bullet-points">Key Points</option>
                      <option value="outline">Structured Outline</option>
                    </select>
                  </div>
                </div>

                <Button 
                  onClick={() => handleGenerate('summarize')} 
                  disabled={isGenerating || !content.trim() || (usageStats?.remainingCredits || 0) <= 0}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Summarizing...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Create Summary
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Translation Tab */}
            <TabsContent value="translate" className="space-y-4">
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <MessageSquare className="w-16 h-16 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Translation Coming Soon</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Multi-language translation features will be available in a future update.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}

          {/* Generated Content Display */}
          {generatedContent && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Generated Content
                </h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedContent)}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => insertIntoContent(generatedContent)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Insert
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-md border">
                <div className="whitespace-pre-wrap text-sm">{generatedContent}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Generations */}
      {recentGenerations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Generations</CardTitle>
            <CardDescription>
              Your recent AI-generated content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentGenerations.slice(0, 5).map((generation) => (
                <div key={generation.id} className="p-3 border rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="capitalize">
                      {generation.type}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(generation.timestamp).toLocaleDateString()}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(generation.content)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {generation.content}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}