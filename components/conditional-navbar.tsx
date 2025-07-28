'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from './navbar'

export function ConditionalNavbar() {
  const pathname = usePathname()
  
  // Don't show the marketing navbar on dashboard or admin pages
  const isDashboardPage = pathname.startsWith('/dashboard') || pathname.startsWith('/admin')
  
  if (isDashboardPage) {
    return null
  }
  
  return <Navbar />
}