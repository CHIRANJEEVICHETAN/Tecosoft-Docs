import { DashboardLayout, SimpleDashboardHeader } from '@/components/dashboard'
import { SubscriptionManagement } from '@/components/dashboard/subscription-management'

export default function BillingPage() {
  return (
    <DashboardLayout>
      <SimpleDashboardHeader 
        title="Billing & Subscription"
        description="Manage your subscription plan and monitor usage limits"
      />
      <SubscriptionManagement />
    </DashboardLayout>
  )
}