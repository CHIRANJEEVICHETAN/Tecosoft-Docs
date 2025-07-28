'use client'

import { usePathname } from 'next/navigation'

interface ConditionalMainProps {
  children: React.ReactNode
}

export function ConditionalMain({ children }: ConditionalMainProps) {
  const pathname = usePathname()
  
  // Use different styling for dashboard pages
  const isDashboardPage = pathname.startsWith('/dashboard') || pathname.startsWith('/admin')
  
  if (isDashboardPage) {
    // Dashboard pages handle their own layout
    return <>{children}</>
  }
  
  // Marketing site styling
  return (
    <main className="sm:container mx-auto w-[90vw] h-auto scroll-smooth">
      {children}
    </main>
  )
}