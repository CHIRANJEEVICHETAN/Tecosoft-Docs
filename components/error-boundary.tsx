'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    console.error('Error Boundary caught an error:', error, errorInfo)
    
    // Check if it's a chunk loading error
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      // Automatically reload the page for chunk errors
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props
      
      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} retry={this.retry} />
      }

      return <DefaultErrorFallback error={this.state.error} retry={this.retry} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, retry }: { error?: Error; retry: () => void }) {
  const isChunkError = error?.name === 'ChunkLoadError' || error?.message.includes('Loading chunk')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isChunkError ? 'Loading Error' : 'Something went wrong'}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isChunkError 
              ? 'The application is updating. Please wait while we reload the page...'
              : 'An unexpected error occurred. Please try again.'
            }
          </p>
          
          {isChunkError ? (
            <div className="flex items-center justify-center">
              <RefreshCw className="animate-spin h-4 w-4 mr-2" />
              <span className="text-sm text-muted-foreground">Reloading...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <Button onClick={retry} className="w-full">
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                Reload Page
              </Button>
            </div>
          )}
          
          {error && process.env.NODE_ENV === 'development' && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Error Details (Development)
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto">
                {error.stack || error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

// Hook for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo)
    
    // Handle chunk loading errors
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      window.location.reload()
    }
  }
}