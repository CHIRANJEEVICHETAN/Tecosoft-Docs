import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // Verify super admin role
  const user = await prisma.user.findUnique({
    where: { clerkId: userId }
  })

  if (!user || user.role !== Role.SUPER_ADMIN) {
    redirect('/unauthorized')
  }

  // Just pass through children - our DashboardLayout component handles the UI
  return <>{children}</>
}

export const metadata = {
  title: 'Admin Panel - Docify.ai Pro',
  description: 'Super Admin panel for platform administration',
}