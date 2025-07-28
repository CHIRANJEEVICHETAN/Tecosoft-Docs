'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/ui/loading'
import { 
  Users, 
  MessageSquare, 
  Bell, 
  CheckSquare, 
  Plus,
  Send,
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  Circle,
  Flag,
  Filter,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus
} from 'lucide-react'

interface TeamMember {
  id: string
  name?: string
  email: string
  imageUrl?: string
  organizationRole: string
  projects: Array<{
    projectId: string
    projectName: string
    projectSlug: string
    role: string
    joinedAt: string
  }>
}

interface Task {
  id: string
  title: string
  description?: string
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  assignedTo?: {
    id: string
    name?: string
    email: string
    imageUrl?: string
  }
  projectId: string
  projectName: string
  dueDate?: string
  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    name?: string
    email: string
  }
}

interface Notification {
  id: string
  type: 'task_assigned' | 'task_completed' | 'project_update' | 'member_added' | 'comment_added'
  title: string
  message: string
  read: boolean
  timestamp: string
  relatedId?: string
  relatedType?: 'task' | 'project' | 'comment'
  user: {
    id: string
    name?: string
    email: string
  }
}

interface Comment {
  id: string
  content: string
  timestamp: string
  user: {
    id: string
    name?: string
    email: string
    imageUrl?: string
  }
  taskId?: string
  projectId?: string
}

interface TeamCollaborationProps {
  members: TeamMember[]
  className?: string
}

export function TeamCollaboration({ members, className }: TeamCollaborationProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'tasks' | 'notifications' | 'communication'>('tasks')
  const [taskFilter, setTaskFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false)
  const [newComment, setNewComment] = useState('')

  useEffect(() => {
    fetchCollaborationData()
  }, [])

  const fetchCollaborationData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch tasks
      const tasksResponse = await fetch('/api/manager/tasks')
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        setTasks(tasksData.data || [])
      }

      // Fetch notifications
      const notificationsResponse = await fetch('/api/manager/notifications')
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json()
        setNotifications(notificationsData.data || [])
      }

      // Fetch comments
      const commentsResponse = await fetch('/api/manager/comments')
      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json()
        setComments(commentsData.data || [])
      }
    } catch (err) {
      console.error('Error fetching collaboration data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch collaboration data')
    } finally {
      setLoading(false)
    }
  }

  const createTask = async (taskData: {
    title: string
    description?: string
    assignedTo?: string
    projectId: string
    priority: string
    dueDate?: string
  }) => {
    try {
      setLoading(true)
      const response = await fetch('/api/manager/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData)
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      await fetchCollaborationData()
      setShowCreateTaskDialog(false)
    } catch (err) {
      console.error('Error creating task:', err)
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const response = await fetch(`/api/manager/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      await fetchCollaborationData()
    } catch (err) {
      console.error('Error updating task:', err)
      setError(err instanceof Error ? err.message : 'Failed to update task')
    }
  }

  const addComment = async (content: string, taskId?: string, projectId?: string) => {
    try {
      const response = await fetch('/api/manager/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          taskId,
          projectId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to add comment')
      }

      await fetchCollaborationData()
      setNewComment('')
    } catch (err) {
      console.error('Error adding comment:', err)
      setError(err instanceof Error ? err.message : 'Failed to add comment')
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/manager/notifications/${notificationId}/read`, {
        method: 'PATCH'
      })
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      )
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'default'
      case 'IN_PROGRESS': return 'secondary'
      case 'BLOCKED': return 'destructive'
      case 'TODO': return 'outline'
      default: return 'outline'
    }
  }

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />
      case 'IN_PROGRESS': return <Clock className="w-4 h-4" />
      case 'BLOCKED': return <AlertCircle className="w-4 h-4" />
      case 'TODO': return <Circle className="w-4 h-4" />
      default: return <Circle className="w-4 h-4" />
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned': return <CheckSquare className="w-4 h-4" />
      case 'task_completed': return <CheckCircle className="w-4 h-4" />
      case 'project_update': return <Flag className="w-4 h-4" />
      case 'member_added': return <UserPlus className="w-4 h-4" />
      case 'comment_added': return <MessageSquare className="w-4 h-4" />
      default: return <Bell className="w-4 h-4" />
    }
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = taskFilter === 'all' || 
                         (taskFilter === 'assigned' && task.assignedTo) ||
                         (taskFilter === 'unassigned' && !task.assignedTo) ||
                         task.status === taskFilter
    
    return matchesSearch && matchesFilter
  })

  const unreadNotifications = notifications.filter(n => !n.read)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team Collaboration</h3>
          <p className="text-sm text-muted-foreground">
            Coordinate tasks, communicate, and track progress
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Bell className="w-4 h-4 mr-2" />
            {unreadNotifications.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {unreadNotifications.length}
              </Badge>
            )}
          </Button>
          <Dialog open={showCreateTaskDialog} onOpenChange={setShowCreateTaskDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Assign a new task to a team member
                </DialogDescription>
              </DialogHeader>
              <CreateTaskForm onSubmit={createTask} members={members} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks" className="relative">
            Tasks
            {tasks.filter(t => t.status !== 'COMPLETED').length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {tasks.filter(t => t.status !== 'COMPLETED').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="relative">
            Notifications
            {unreadNotifications.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {unreadNotifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          {/* Task Filters */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={taskFilter} onValueChange={setTaskFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="TODO">To Do</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="BLOCKED">Blocked</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tasks List */}
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{task.title}</h4>
                        <Badge variant={getTaskStatusColor(task.status)} className="text-xs">
                          <div className="flex items-center space-x-1">
                            {getTaskStatusIcon(task.status)}
                            <span>{task.status.toLowerCase().replace('_', ' ')}</span>
                          </div>
                        </Badge>
                        <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                          {task.priority.toLowerCase()}
                        </Badge>
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>{task.projectName}</span>
                        {task.dueDate && (
                          <>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                            </div>
                          </>
                        )}
                        <span>•</span>
                        <span>Created by {task.createdBy.name || task.createdBy.email}</span>
                      </div>
                      
                      {task.assignedTo && (
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs">
                            {task.assignedTo.name ? task.assignedTo.name.charAt(0).toUpperCase() : task.assignedTo.email.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm">{task.assignedTo.name || task.assignedTo.email}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Select
                        value={task.status}
                        onValueChange={(status) => updateTaskStatus(task.id, status)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TODO">To Do</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="BLOCKED">Blocked</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredTasks.length === 0 && (
              <div className="text-center py-12">
                <CheckSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Tasks Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || taskFilter !== 'all' 
                    ? 'No tasks match your current filters.'
                    : 'Create your first task to start collaborating.'
                  }
                </p>
                {(!searchTerm && taskFilter === 'all') && (
                  <Button onClick={() => setShowCreateTaskDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Task
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`cursor-pointer transition-colors ${
                  !notification.read ? 'bg-primary/5 border-primary/20' : ''
                }`}
                onClick={() => !notification.read && markNotificationAsRead(notification.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <span className="text-xs text-muted-foreground">
                          {new Date(notification.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        from {notification.user.name || notification.user.email}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {notifications.length === 0 && (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Notifications</h3>
                <p className="text-muted-foreground">
                  You'll see team updates and task notifications here.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Communication Tab */}
        <TabsContent value="communication" className="space-y-4">
          {/* Add Comment Form */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <h4 className="font-medium">Team Communication</h4>
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="Share an update with your team..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={() => addComment(newComment)}
                    disabled={!newComment.trim()}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments List */}
          <div className="space-y-3">
            {comments.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm">
                      {comment.user.name ? comment.user.name.charAt(0).toUpperCase() : comment.user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{comment.user.name || comment.user.email}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {comments.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Messages Yet</h3>
                <p className="text-muted-foreground">
                  Start a conversation with your team members.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  )
}

// Create Task Form Component
function CreateTaskForm({ 
  onSubmit, 
  members 
}: { 
  onSubmit: (data: any) => void
  members: TeamMember[]
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    projectId: '',
    priority: 'MEDIUM',
    dueDate: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  // Get unique projects from members
  const projects = Array.from(
    new Set(
      members.flatMap(member => 
        member.projects.map(project => ({
          id: project.projectId,
          name: project.projectName
        }))
      )
    )
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Title</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Enter task title"
          required
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter task description"
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Project</label>
          <Select
            value={formData.projectId}
            onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium">Priority</label>
          <Select
            value={formData.priority}
            onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Assign To</label>
          <Select
            value={formData.assignedTo}
            onValueChange={(value) => setFormData(prev => ({ ...prev, assignedTo: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select member" />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name || member.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium">Due Date</label>
          <Input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit">
          Create Task
        </Button>
      </div>
    </form>
  )
}