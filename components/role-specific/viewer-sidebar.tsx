'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
// Simplified types to avoid Prisma dependency issues
type Role = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'MANAGER' | 'USER' | 'VIEWER'
type ProjectMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
import { 
  Home,
  BookOpen, 
  FolderOpen, 
  Globe,
  User,
  Search,
  Eye,
  Clock,
  Tag,
  Star,
  Bookmark
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface ViewerSidebarProps {
  userRole: Role
  projectId?: string
  projectRole?: ProjectMemberRole
}

export function ViewerSidebar({ userRole, projectId, projectRole }: ViewerSidebarProps) {
  const pathname = usePathname()
  const [searchTerm, setSearchTerm] = useState('')

  const isActive = (path: string) => pathname === path || pathname.startsWith(path)

  const getRoleBadge = () => {
    if (projectRole) {
      return (
        <Badge className="text-xs bg-gray-100 text-gray-800">
          Project Viewer
        </Badge>
      )
    }

    return (
      <Badge className="text-xs bg-gray-100 text-gray-800">
        Viewer
      </Badge>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Documentation</h2>
          {getRoleBadge()}
        </div>
        <p className="text-sm text-gray-500 mt-1">Read-only access</p>
      </div>

      {/* Quick Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search documentation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-8"
          />
        </div>
      </div>

      <div className="p-2">
        {/* Navigation */}
        <nav className="space-y-1">
          {/* Home/Dashboard */}
          <Link 
            href="/dashboard" 
            className={`flex items-center p-2 text-sm rounded-md transition-colors ${
              isActive('/dashboard') && pathname === '/dashboard'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            <Home className="h-4 w-4 mr-2" />
            Home
          </Link>

          {/* Browse Content */}
          <div className="py-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">
              Browse Content
            </h3>
            
            <Link 
              href="/dashboard/browse/all" 
              className={`flex items-center p-2 text-sm rounded-md transition-colors ${
                isActive('/dashboard/browse/all') 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              All Documentation
            </Link>

            <Link 
              href="/dashboard/browse/categories" 
              className={`flex items-center p-2 text-sm rounded-md transition-colors ${
                isActive('/dashboard/browse/categories') 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <Tag className="h-4 w-4 mr-2" />
              Categories
            </Link>

            <Link 
              href="/dashboard/browse/popular" 
              className={`flex items-center p-2 text-sm rounded-md transition-colors ${
                isActive('/dashboard/browse/popular') 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <Star className="h-4 w-4 mr-2" />
              Popular
            </Link>

            <Link 
              href="/dashboard/browse/recent" 
              className={`flex items-center p-2 text-sm rounded-md transition-colors ${
                isActive('/dashboard/browse/recent') 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <Clock className="h-4 w-4 mr-2" />
              Recently Updated
            </Link>
          </div>

          {/* Projects (if applicable) */}
          {projectId && (
            <div className="py-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">
                Current Project
              </h3>
              
              <Link 
                href={`/dashboard/projects/${projectId}`} 
                className={`flex items-center p-2 text-sm rounded-md transition-colors ${
                  isActive(`/dashboard/projects/${projectId}`) 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Project Overview
              </Link>

              <Link 
                href={`/dashboard/projects/${projectId}/docs`} 
                className={`flex items-center p-2 text-sm rounded-md transition-colors ${
                  isActive(`/dashboard/projects/${projectId}/docs`) 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Project Documentation
              </Link>
            </div>
          )}

          {/* My Activity */}
          <div className="py-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">
              My Activity
            </h3>
            
            <Link 
              href="/dashboard/bookmarks" 
              className={`flex items-center p-2 text-sm rounded-md transition-colors ${
                isActive('/dashboard/bookmarks') 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <Bookmark className="h-4 w-4 mr-2" />
              Bookmarks
            </Link>

            <Link 
              href="/dashboard/history" 
              className={`flex items-center p-2 text-sm rounded-md transition-colors ${
                isActive('/dashboard/history') 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <Eye className="h-4 w-4 mr-2" />
              Reading History
            </Link>

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
          </div>

          {/* Quick Links */}
          <div className="py-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">
              Quick Links
            </h3>
            
            <Link 
              href="/docs" 
              className={`flex items-center p-2 text-sm rounded-md transition-colors ${
                pathname.startsWith('/docs') 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <Globe className="h-4 w-4 mr-2" />
              Public Documentation
            </Link>
          </div>
        </nav>

        {/* Recent Views */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Recently Viewed
          </h3>
          <div className="space-y-2">
            <Link 
              href="/docs/getting-started" 
              className="block p-2 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                <span className="truncate">Getting Started Guide</span>
              </div>
            </Link>
            <Link 
              href="/docs/api-reference" 
              className="block p-2 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                <span className="truncate">API Reference</span>
              </div>
            </Link>
            <Link 
              href="/docs/troubleshooting" 
              className="block p-2 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0"></div>
                <span className="truncate">Troubleshooting</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Need Help?
          </h3>
          <div className="text-xs text-gray-500 space-y-2">
            <p>Browse the documentation or contact your administrator for access to additional features.</p>
            <Link 
              href="/help" 
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View Help Center →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
