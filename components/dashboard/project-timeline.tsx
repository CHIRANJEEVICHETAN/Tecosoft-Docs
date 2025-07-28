'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { LoadingSpinner } from '@/components/ui/loading'
import { 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Flag,
  Target,
  TrendingUp,
  Users,
  FileText
} from 'lucide-react'

interface Milestone {
  id: string
  title: string
  description?: string
  dueDate: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  progress: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  assignedTo: Array<{
    id: string
    name?: string
    email: string
    imageUrl?: string
  }>
  tasks: Array<{
    id: string
    title: string
    completed: boolean
    assignedTo?: string
  }>
  createdAt: string
  updatedAt: string
}

interface TimelineEvent {
  id: string
  type: 'milestone_created' | 'milestone_completed' | 'task_completed' | 'member_added' | 'document_created'
  title: string
  description: string
  timestamp: string
  user: {
    id: string
    name?: string
    email: string
  }
  metadata?: Record<string, any>
}

interface ProjectTimelineProps {
  projectId: string
  className?: string
}

export function ProjectTimeline({ projectId, className }: ProjectTimelineProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'milestones' | 'timeline'>('milestones')

  useEffect(() => {
    fetchProjectData()
  }, [projectId])

  const fetchProjectData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch milestones
      const milestonesResponse = await fetch(`/api/projects/${projectId}/milestones`)
      if (milestonesResponse.ok) {
        const milestonesData = await milestonesResponse.json()
        setMilestones(milestonesData.data || [])
      }

      // Fetch timeline
      const timelineResponse = await fetch(`/api/projects/${projectId}/timeline`)
      if (timelineResponse.ok) {
        const timelineData = await timelineResponse.json()
        setTimeline(timelineData.data || [])
      }
    } catch (err) {
      console.error('Error fetching project data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch project data')
    } finally {
      setLoading(false)
    }
  }

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'default'
      case 'IN_PROGRESS': return 'secondary'
      case 'OVERDUE': return 'destructive'
      case 'PENDING': return 'outline'
      default: return 'outline'
    }
  }

  const getMilestoneStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />
      case 'IN_PROGRESS': return <Clock className="w-4 h-4" />
      case 'OVERDUE': return <AlertCircle className="w-4 h-4" />
      case 'PENDING': return <Calendar className="w-4 h-4" />
      default: return <Calendar className="w-4 h-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'destructive'
      case 'HIGH': return 'default'
      case 'MEDIUM': return 'secondary'
      case 'LOW': return 'outline'
      default: return 'outline'
    }
  }

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'milestone_created': return <Flag className="w-4 h-4" />
      case 'milestone_completed': return <Target className="w-4 h-4" />
      case 'task_completed': return <CheckCircle className="w-4 h-4" />
      case 'member_added': return <Users className="w-4 h-4" />
      case 'document_created': return <FileText className="w-4 h-4" />
      default: return <Calendar className="w-4 h-4" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays > 0) return `In ${diffDays} days`
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`
    
    return date.toLocaleDateString()
  }

  const calculateOverallProgress = () => {
    if (milestones.length === 0) return 0
    const totalProgress = milestones.reduce((sum, milestone) => sum + milestone.progress, 0)
    return Math.round(totalProgress / milestones.length)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Error Loading Timeline</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchProjectData}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Project Timeline</h3>
            <p className="text-sm text-muted-foreground">
              Track milestones and project progress
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Milestone
          </Button>
        </div>

        {/* Overall Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">{calculateOverallProgress()}%</span>
              </div>
              <Progress value={calculateOverallProgress()} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{milestones.filter(m => m.status === 'COMPLETED').length} completed</span>
                <span>{milestones.length} total milestones</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('milestones')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            activeTab === 'milestones' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Milestones
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            activeTab === 'timeline' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Activity Timeline
        </button>
      </div>

      {/* Milestones Tab */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          {milestones.map((milestone) => (
            <Card key={milestone.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-base">{milestone.title}</CardTitle>
                      <Badge variant={getPriorityColor(milestone.priority)} className="text-xs">
                        {milestone.priority.toLowerCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Badge variant={getMilestoneStatusColor(milestone.status)} className="text-xs">
                          <div className="flex items-center space-x-1">
                            {getMilestoneStatusIcon(milestone.status)}
                            <span>{milestone.status.toLowerCase().replace('_', ' ')}</span>
                          </div>
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(milestone.dueDate)}</span>
                      </div>
                    </div>
                    {milestone.description && (
                      <CardDescription className="text-sm">
                        {milestone.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-muted-foreground">{milestone.progress}%</span>
                    </div>
                    <Progress value={milestone.progress} className="h-2" />
                  </div>

                  {/* Assigned Users */}
                  {milestone.assignedTo.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Assigned To</span>
                      <div className="flex flex-wrap gap-2">
                        {milestone.assignedTo.map((user) => (
                          <div key={user.id} className="flex items-center space-x-2 bg-muted rounded-full px-3 py-1">
                            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs">
                              {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs">{user.name || user.email}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tasks */}
                  {milestone.tasks.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Tasks</span>
                        <span className="text-xs text-muted-foreground">
                          {milestone.tasks.filter(t => t.completed).length} / {milestone.tasks.length} completed
                        </span>
                      </div>
                      <div className="space-y-1">
                        {milestone.tasks.slice(0, 3).map((task) => (
                          <div key={task.id} className="flex items-center space-x-2 text-sm">
                            <CheckCircle className={`w-4 h-4 ${task.completed ? 'text-green-600' : 'text-muted-foreground'}`} />
                            <span className={task.completed ? 'line-through text-muted-foreground' : ''}>
                              {task.title}
                            </span>
                          </div>
                        ))}
                        {milestone.tasks.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{milestone.tasks.length - 3} more tasks
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {milestones.length === 0 && (
            <div className="text-center py-12">
              <Flag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Milestones Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first milestone to start tracking project progress.
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create First Milestone
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {timeline.map((event, index) => (
            <div key={event.id} className="flex space-x-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  {getTimelineIcon(event.type)}
                </div>
                {index < timeline.length - 1 && (
                  <div className="w-px h-8 bg-border mt-2" />
                )}
              </div>
              <div className="flex-1 pb-8">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{event.title}</h4>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                  <p className="text-xs text-muted-foreground">
                    by {event.user.name || event.user.email}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {timeline.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Activity Yet</h3>
              <p className="text-muted-foreground">
                Project activity will appear here as team members work on milestones and tasks.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}