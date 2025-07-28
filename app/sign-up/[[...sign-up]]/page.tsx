import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-config";

export default function Page() {
  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <SignUp 
        appearance={clerkAppearance}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
      />
    </div>
  );
}
