import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ShieldXIcon, ArrowLeftIcon } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-6">
          <ShieldXIcon className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this organization or resource.
          </p>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This could happen if:
          </p>
          <ul className="text-sm text-muted-foreground text-left space-y-1">
            <li>• You're not a member of this organization</li>
            <li>• Your access has been revoked</li>
            <li>• The organization doesn't exist</li>
          </ul>
        </div>

        <div className="mt-8 space-y-3">
          <Link
            href="/dashboard"
            className={buttonVariants({ className: "w-full" })}
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className={buttonVariants({ variant: "outline", className: "w-full" })}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}