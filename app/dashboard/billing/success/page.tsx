import Link from 'next/link'
import { CheckCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function BillingSuccessPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle>Subscription Updated!</CardTitle>
            <CardDescription>
              Your subscription has been successfully updated. You now have access to all the features of your new plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                It may take a few minutes for all features to become available.
              </p>
              
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link href="/dashboard">
                    Go to Dashboard
                  </Link>
                </Button>
                
                <Button variant="outline" asChild className="w-full">
                  <Link href="/dashboard/billing">
                    View Billing Details
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}