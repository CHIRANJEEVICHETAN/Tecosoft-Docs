import Link from 'next/link'
import { XCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function BillingCancelPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <XCircleIcon className="w-8 h-8 text-gray-600" />
            </div>
            <CardTitle>Subscription Update Cancelled</CardTitle>
            <CardDescription>
              Your subscription update was cancelled. No changes have been made to your current plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                You can try again anytime or contact support if you need assistance.
              </p>
              
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link href="/dashboard/billing">
                    Back to Billing
                  </Link>
                </Button>
                
                <Button variant="outline" asChild className="w-full">
                  <Link href="/dashboard">
                    Go to Dashboard
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