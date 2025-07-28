import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';



// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/blog(.*)",
  "/api/webhooks(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)"
]);

// Define tenant-isolated routes that require organization context
const isTenantRoute = createRouteMatcher([
  "/org/(.*)",
  "/api/organizations/(.*)",
  "/api/projects/(.*)",
  "/api/users/roles(.*)",
  "/api/permissions/(.*)"
]);

// Define dashboard routes that require role-based access control
const isDashboardRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/admin/dashboard(.*)"
]);



export default clerkMiddleware(async (auth, req) => {
  // Allow public routes without authentication
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protect all other routes
  await auth.protect();

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // Dashboard route protection - simplified without database calls
  if (isDashboardRoute(req)) {
    // Let the dashboard components handle role-based routing
    // This avoids database calls in middleware which cause Edge Runtime issues
    return NextResponse.next();
  }

  // Additional tenant isolation for tenant-specific routes
  if (isTenantRoute(req)) {
    // Let the API routes handle tenant validation
    // This avoids database calls in middleware which cause Edge Runtime issues
    return NextResponse.next();
  }

  return NextResponse.next();
});
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
