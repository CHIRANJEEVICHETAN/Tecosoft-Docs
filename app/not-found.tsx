import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { FileQuestionIcon, ArrowLeftIcon, SearchIcon } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-6">
          <FileQuestionIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Page Not Found</h1>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Here are some helpful links instead:
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <Link
            href="/dashboard"
            className={buttonVariants({ className: "w-full" })}
          >
            <SearchIcon className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Link>
          <Link
            href="/docs"
            className={buttonVariants({ variant: "outline", className: "w-full" })}
          >
            Browse Documentation
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