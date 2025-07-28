'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
// Simplified types to avoid Prisma dependency issues
type Role = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'MANAGER' | 'USER' | 'VIEWER'
type ProjectMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
import { 
  Settings, 
  Users, 
  Shield, 
  BarChart3, 
  FolderOpen, 
  Database,
  UserCog,
  FileText,
  Globe,
  Building,
  Crown,
  ChevronDown,
  ChevronRight,
  Home,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface AdminSidebarProps {
  userRole: Role
  projectId?: string
  projectRole?: ProjectMemberRole
}

export function AdminSidebar({ userRole, projectId, projectRole }: AdminSidebarProps) {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<string[]>(['main'])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const isActive = (path: string) => pathname === path

  const getRoleBadge = () => {
    if (projectRole) {
      const colors = {
        'OWNER': 'bg-red-100 text-red-800',
        'ADMIN': 'bg-purple-100 text-purple-800',
        'MEMBER': 'bg-blue-100 text-blue-800',
        'VIEWER': 'bg-gray-100 text-gray-800'
      }
      return (
        <Badge className={`text-xs ${colors[projectRole]}`}>
          Project {projectRole}
        </Badge>
      )
    }

    const orgColors = {
      'SUPER_ADMIN': 'bg-red-100 text-red-800',
      'ORG_ADMIN': 'bg-purple-100 text-purple-800',
      'MANAGER': 'bg-blue-100 text-blue-800',
      'USER': 'bg-green-100 text-green-800',
      'VIEWER': 'bg-gray-100 text-gray-800'
    }

    return (
      <Badge className={`text-xs ${orgColors[userRole]}`}>
        {userRole === 'SUPER_ADMIN' ? 'Super Admin' : 
         userRole === 'ORG_ADMIN' ? 'Org Admin' : userRole}
      </Badge>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Admin Panel</h2>
          {getRoleBadge()}
        </div>
        {projectId && (
          <p className="text-sm text-gray-500 mt-1">Project Access</p>
        )}
      </div>

      <div className="p-2">
        {/* Quick Actions */}
        <div className="mb-4">
          <div className="flex gap-2">
            <Button size="sm" className="flex-1">
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {/* Main Section */}
          <Collapsible 
            open={expandedSections.includes('main')}
            onOpenChange={() => toggleSection('main')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
              <span className="flex items-center">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </span>
              {expandedSections.includes('main') ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-6 space-y-1">
              <Link 
                href="/dashboard" 
                className={`block p-2 text-sm rounded-md transition-colors ${
                  isActive('/dashboard') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                Overview
              </Link>
              <Link 
                href="/dashboard/analytics" 
                className={`block p-2 text-sm rounded-md transition-colors ${
                  isActive('/dashboard/analytics') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <BarChart3 className="h-4 w-4 inline mr-2" />
                Analytics
              </Link>
            </CollapsibleContent>
          </Collapsible>

          {/* Organization Management - Only for org admins */}
          {(userRole === 'SUPER_ADMIN' || userRole === 'ORG_ADMIN') && (
            <Collapsible 
              open={expandedSections.includes('org')}
              onOpenChange={() => toggleSection('org')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
                <span className="flex items-center">
                  <Building className="h-4 w-4 mr-2" />
                  Organization
                </span>
                {expandedSections.includes('org') ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
              </CollapsibleTrigger>
              <CollapsibleContent className="ml-6 space-y-1">
                <Link 
                  href="/dashboard/organization" 
                  className={`block p-2 text-sm rounded-md transition-colors ${
                    isActive('/dashboard/organization') 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                >
                  Settings
                </Link>
                <Link 
                  href="/dashboard/billing" 
                  className={`block p-2 text-sm rounded-md transition-colors ${
                    isActive('/dashboard/billing') 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                >
                  Billing
                </Link>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* User Management */}
          <Collapsible 
            open={expandedSections.includes('users')}
            onOpenChange={() => toggleSection('users')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
              <span className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                User Management
              </span>
              {expandedSections.includes('users') ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-6 space-y-1">
              <Link 
                href="/dashboard/users" 
                className={`block p-2 text-sm rounded-md transition-colors ${
                  isActive('/dashboard/users') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                All Users
              </Link>
              <Link 
                href="/dashboard/roles" 
                className={`block p-2 text-sm rounded-md transition-colors ${
                  isActive('/dashboard/roles') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <UserCog className="h-4 w-4 inline mr-2" />
                Role Management
              </Link>
              <Link 
                href="/dashboard/permissions" 
                className={`block p-2 text-sm rounded-md transition-colors ${
                  isActive('/dashboard/permissions') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <Shield className="h-4 w-4 inline mr-2" />
                Permissions
              </Link>
            </CollapsibleContent>
          </Collapsible>

          {/* Project Management */}
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
                href="/dashboard/projects" 
                className={`block p-2 text-sm rounded-md transition-colors ${
                  isActive('/dashboard/projects') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                All Projects
              </Link>
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
                    href={`/dashboard/projects/${projectId}/members`} 
                    className={`block p-2 text-sm rounded-md transition-colors ${
                      isActive(`/dashboard/projects/${projectId}/members`) 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                    }`}
                  >
                    Project Members
                  </Link>
                </>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Content Management */}
          <Collapsible 
            open={expandedSections.includes('content')}
            onOpenChange={() => toggleSection('content')}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
              <span className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Content
              </span>
              {expandedSections.includes('content') ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-6 space-y-1">
              <Link 
                href="/dashboard/content" 
                className={`block p-2 text-sm rounded-md transition-colors ${
                  isActive('/dashboard/content') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                All Content
              </Link>
              <Link 
                href="/dashboard/content/drafts" 
                className={`block p-2 text-sm rounded-md transition-colors ${
                  isActive('/dashboard/content/drafts') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                Drafts
              </Link>
              <Link 
                href="/dashboard/content/published" 
                className={`block p-2 text-sm rounded-md transition-colors ${
                  isActive('/dashboard/content/published') 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                Published
              </Link>
            </CollapsibleContent>
          </Collapsible>

          {/* System Management - Super Admin only */}
          {userRole === 'SUPER_ADMIN' && (
            <Collapsible 
              open={expandedSections.includes('system')}
              onOpenChange={() => toggleSection('system')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
                <span className="flex items-center">
                  <Crown className="h-4 w-4 mr-2" />
                  System
                </span>
                {expandedSections.includes('system') ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
              </CollapsibleTrigger>
              <CollapsibleContent className="ml-6 space-y-1">
                <Link 
                  href="/dashboard/system/settings" 
                  className={`block p-2 text-sm rounded-md transition-colors ${
                    isActive('/dashboard/system/settings') 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                >
                  Global Settings
                </Link>
                <Link 
                  href="/dashboard/system/database" 
                  className={`block p-2 text-sm rounded-md transition-colors ${
                    isActive('/dashboard/system/database') 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                >
                  <Database className="h-4 w-4 inline mr-2" />
                  Database
                </Link>
                <Link 
                  href="/dashboard/system/logs" 
                  className={`block p-2 text-sm rounded-md transition-colors ${
                    isActive('/dashboard/system/logs') 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                >
                  System Logs
                </Link>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Public Site */}
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
      </div>
    </div>
  )
}
