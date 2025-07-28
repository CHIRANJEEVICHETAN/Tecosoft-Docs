'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
// Simplified types to avoid Prisma dependency issues
type Role = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'MANAGER' | 'USER' | 'VIEWER'
type ProjectMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
import { 
  Home,
  FileText, 
  FolderOpen, 
  Globe,
  User,
  Edit,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Search,
  Clock,
  Tag
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'

interface UserSidebarProps {
  userRole: Role
  projectId?: string
  projectRole?: ProjectMemberRole
}

export function UserSidebar({ userRole, projectId, projectRole }: UserSidebarProps) {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<string[]>(['main'])
  const [searchTerm, setSearchTerm] = useState('')

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path)

  const getRoleBadge = () => {
    if (projectRole) {
      const colors = {
        [ProjectMemberRole.OWNER]: 'bg-red-100 text-red-800',
        [ProjectMemberRole.ADMIN]: 'bg-purple-100 text-purple-800',
        [ProjectMemberRole.MEMBER]: 'bg-blue-100 text-blue-800',
        [ProjectMemberRole.VIEWER]: 'bg-gray-100 text-gray-800'
      }
      return (
        <Badge className={`text-xs ${colors[projectRole]}`}>
          {projectRole}
        </Badge>
      )
    }

    const orgColors = {
      [Role.SUPER_ADMIN]: 'bg-red-100 text-red-800',
      [Role.ORG_ADMIN]: 'bg-purple-100 text-purple-800',
      [Role.MANAGER]: 'bg-blue-100 text-blue-800',
      [Role.USER]: 'bg-green-100 text-green-800',
      [Role.VIEWER]: 'bg-gray-100 text-gray-800'
    }

    return (
      <Badge className={`text-xs ${orgColors[userRole]}`}>
        {userRole === Role.MANAGER ? 'Manager' : 'User'}
      </Badge>
    )
  }

  const canCreateContent = projectRole 
    ? [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN, ProjectMemberRole.MEMBER].includes(projectRole)
    : [Role.MANAGER, Role.USER].includes(userRole)

  const canManageProjects = [Role.MANAGER].includes(userRole) || 
    (projectRole && [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN].includes(projectRole))

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Workspace</h2>
          {getRoleBadge()}
        </div>
        {projectId && (
          <p className="text-sm text-gray-500 mt-1">Project Member</p>
        )}
      </div>

      {/* Quick Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-8"
          />
        </div>
      </div>

      <div className="p-2">
        {/* Quick Actions */}
        {canCreateContent && (
          <div className="mb-4">
            <Button size="sm" className="w-full">
              <Edit className="h-4 w-4 mr-2" />
              Create Content
            </Button>
          </div>
        )}

        {/* Navigation */}
        <nav className="space-y-1">
          {/* Dashboard */}
          <Link 
            href="/dashboard" 
            className={`flex items-center p-2 text-sm rounded-md transition-colors ${
              isActive('/dashboard') && !pathname.includes('/')
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Link>

          {/* My Content */}
          <Collapsible 
            open={expandedSections.includes('content')}
            onOpenChange={() => toggleSection('content')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
              <span className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                My Content
              </span>
              {expandedSections.includes('content') ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-6 space-y-1">
              <Link 
                href="/dashboard/content/my-drafts" 
                className={`block p-2 text-sm rounded-md transition-colors ${
                  isActive('/dashboard/content/my-drafts') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <Edit className="h-4 w-4 inline mr-2" />
                My Drafts
              </Link>
              <Link 
                href="/dashboard/content/my-published" 
                className={`block p-2 text-sm rounded-md transition-colors ${
                  isActive('/dashboard/content/my-published') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <BookOpen className="h-4 w-4 inline mr-2" />
                Published
              </Link>
              <Link 
                href="/dashboard/content/recent" 
                className={`block p-2 text-sm rounded-md transition-colors ${
                  isActive('/dashboard/content/recent') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <Clock className="h-4 w-4 inline mr-2" />
                Recent
              </Link>
            </CollapsibleContent>
          </Collapsible>

          {/* Projects */}
          <Collapsible 
            open={expandedSections.includes('projects')}
            onOpenChange={() => toggleSection('projects')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
              <span className="flex items-center">
                <FolderOpen className="h-4 w-4 mr-2" />
                Projects
              </span>
              {expandedSections.includes('projects') ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-6 space-y-1">
              <Link 
                href="/dashboard/projects/my-projects" 
                className={`block p-2 text-sm rounded-md transition-colors ${
                  isActive('/dashboard/projects/my-projects') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                My Projects
              </Link>
              {canManageProjects && (
                <Link 
                  href="/dashboard/projects/create" 
                  className={`block p-2 text-sm rounded-md transition-colors ${
                    isActive('/dashboard/projects/create') 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                >
                  Create Project
                </Link>
              )}
              {projectId && (
                <>
                  <Link 
                    href={`/dashboard/projects/${projectId}`} 
                    className={`block p-2 text-sm rounded-md transition-colors ${
                      isActive(`/dashboard/projects/${projectId}`) 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                    }`}
                  >
                    Current Project
                  </Link>
                  <Link 
                    href={`/dashboard/projects/${projectId}/content`} 
                    className={`block p-2 text-sm rounded-md transition-colors ${
                      isActive(`/dashboard/projects/${projectId}/content`) 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                    }`}
                  >
                    Project Content
                  </Link>
                </>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Browse */}
          <Collapsible 
            open={expandedSections.includes('browse')}
            onOpenChange={() => toggleSection('browse')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
              <span className="flex items-center">
                <Search className="h-4 w-4 mr-2" />
                Browse
              </span>
              {expandedSections.includes('browse') ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-6 space-y-1">
              <Link 
                href="/dashboard/browse/all-content" 
                className={`block p-2 text-sm rounded-md transition-colors ${
                  isActive('/dashboard/browse/all-content') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                All Content
              </Link>
              <Link 
                href="/dashboard/browse/categories" 
                className={`block p-2 text-sm rounded-md transition-colors ${
                  isActive('/dashboard/browse/categories') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <Tag className="h-4 w-4 inline mr-2" />
                Categories
              </Link>
              <Link 
                href="/dashboard/browse/popular" 
                className={`block p-2 text-sm rounded-md transition-colors ${
                  isActive('/dashboard/browse/popular') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                Popular
              </Link>
            </CollapsibleContent>
          </Collapsible>

          {/* Account */}
          <Link 
            href="/dashboard/profile" 
            className={`flex items-center p-2 text-sm rounded-md transition-colors ${
              isActive('/dashboard/profile') 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            <User className="h-4 w-4 mr-2" />
            My Profile
          </Link>

          {/* Public Documentation */}
          <Link 
            href="/docs" 
            className={`flex items-center p-2 text-sm rounded-md transition-colors ${
              pathname.startsWith('/docs') 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            <Globe className="h-4 w-4 mr-2" />
            View Documentation
          </Link>
        </nav>

        {/* Recent Activity - if available */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Recent Activity
          </h3>
          <div className="space-y-2 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Edited "Getting Started"</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>Created new draft</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>Joined project "API Docs"</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
