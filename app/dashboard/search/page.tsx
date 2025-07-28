import { DashboardLayout, SimpleDashboardHeader } from '@/components/dashboard'
import { DocumentSearch } from '@/components/dashboard/document-search'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchIcon } from 'lucide-react'

export default function SearchPage() {
  return (
    <DashboardLayout>
      <SimpleDashboardHeader 
        title="Search Documents"
        description="Find any document across all your projects quickly and efficiently"
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main search area */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SearchIcon className="w-5 h-5" />
                Document Search
              </CardTitle>
              <CardDescription>
                Search across all documents you have access to
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* This would be populated with user's organization ID */}
              <DocumentSearch organizationId="" userId="" />
            </CardContent>
          </Card>
        </div>

        {/* Search tips sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <strong>Exact phrases:</strong> Use quotes "exact phrase"
              </div>
              <div>
                <strong>Multiple terms:</strong> Use AND, OR operators
              </div>
              <div>
                <strong>Exclude terms:</strong> Use minus sign -unwanted
              </div>
              <div>
                <strong>Wildcards:</strong> Use * for partial matches
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Searches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4 text-muted-foreground text-sm">
                No recent searches
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}