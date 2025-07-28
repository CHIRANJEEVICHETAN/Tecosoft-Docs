import { UserProfile } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-config";

export default function UserProfilePage() {
  return (
    <div className="flex justify-center items-center min-h-[80vh] py-8">
      <UserProfile 
        appearance={clerkAppearance}
        routing="path" 
        path="/profile" 
      />
    </div>
  );
}
