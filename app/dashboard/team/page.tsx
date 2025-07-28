import { TeamManagement, DashboardLayout, SimpleDashboardHeader } from '@/components/dashboard'

export default function TeamPage() {
  return (
    <DashboardLayout>
      <SimpleDashboardHeader 
        title="Team Management"
        description="Manage your organization's team members and their roles"
      />
      <TeamManagement />
    </DashboardLayout>
  )
}