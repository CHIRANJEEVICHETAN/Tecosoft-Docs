import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-config";

export default function Page() {
  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <SignIn 
        appearance={clerkAppearance}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
      />
    </div>
  );
}
