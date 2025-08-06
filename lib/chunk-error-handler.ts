'use client'

// Global chunk loading error handler
export function setupChunkErrorHandler() {
  if (typeof window === 'undefined') return

  // Handle unhandled promise rejections (chunk loading errors)
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason
    
    // Check if it's a chunk loading error
    if (
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Loading CSS chunk') ||
      error?.message?.includes('Loading JS chunk')
    ) {
      console.warn('Chunk loading error detected, reloading page...', error)
      
      // Prevent the error from being logged to console
      event.preventDefault()
      
      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 100)
    }
  })

  // Handle script loading errors
  window.addEventListener('error', (event) => {
    const target = event.target as HTMLScriptElement | HTMLLinkElement
    
    if (target?.tagName === 'SCRIPT' || target?.tagName === 'LINK') {
      const src = target.tagName === 'SCRIPT' 
        ? (target as HTMLScriptElement).src 
        : (target as HTMLLinkElement).href
      
      // Check if it's a Next.js chunk
      if (src?.includes('/_next/static/')) {
        console.warn('Next.js chunk failed to load, reloading page...', src)
        
        // Reload the page after a short delay
        setTimeout(() => {
          window.location.reload()
        }, 100)
      }
    }
  }, true) // Use capture phase to catch errors early

  // Handle webpack chunk loading errors specifically
  if (typeof window !== 'undefined' && 'webpackChunkName' in window) {
    const originalRequire = (window as any).__webpack_require__
    
    if (originalRequire) {
      const originalEnsure = originalRequire.e
      
      if (originalEnsure) {
        originalRequire.e = function(chunkId: string) {
          return originalEnsure.call(this, chunkId).catch((error: Error) => {
            console.warn('Webpack chunk loading failed, reloading page...', error)
            
            // Reload the page for chunk loading failures
            setTimeout(() => {
              window.location.reload()
            }, 100)
            
            // Re-throw the error to maintain normal error handling
            throw error
          })
        }
      }
    }
  }
}

// Auto-setup when imported
if (typeof window !== 'undefined') {
  setupChunkErrorHandler()
}