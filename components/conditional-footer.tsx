'use client'

import { usePathname } from 'next/navigation'
import { Footer } from './footer'

export function ConditionalFooter() {
  const pathname = usePathname()
  
  // Don't show the footer on dashboard or admin pages
  const isDashboardPage = pathname.startsWith('/dashboard') || pathname.startsWith('/admin')
  
  if (isDashboardPage) {
    return null
  }
  
  return <Footer />
}