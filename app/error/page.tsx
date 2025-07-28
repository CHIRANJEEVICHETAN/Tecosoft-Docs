import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { AlertTriangleIcon, ArrowLeftIcon, RefreshCwIcon } from "lucide-react";

export default function ErrorPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-6">
          <AlertTriangleIcon className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground">
            We encountered an unexpected error while processing your request.
          </p>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This might be a temporary issue. Please try again or contact support if the problem persists.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <button
            onClick={() => window.location.reload()}
            className={buttonVariants({ className: "w-full" })}
          >
            <RefreshCwIcon className="w-4 h-4 mr-2" />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "outline", className: "w-full" })}
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className={buttonVariants({ variant: "ghost", className: "w-full" })}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}