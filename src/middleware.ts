import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { 
  canAccessAdminRoutes, 
  canAccessCoordinatorRoutes, 
  getDashboardRoute, 
  type UserRole 
} from "@/lib/auth-utils";

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Allow access to public routes
  const publicRoutes = [
    "/",
    "/sign-in",
    "/sign-up",
    "/unauthorized",
    "/api",
    "/trpc",
    "/_next",
    "/favicon.ico",
  ];

  // Check if the route is public or starts with a public path
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Redirect to sign-in if no session
  if (!session?.user) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Role-based route protection
  const userRole = session.user.role as UserRole;

  // Admin routes protection
  if (pathname.startsWith("/admin")) {
    if (!canAccessAdminRoutes(userRole)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  // Coordinator routes protection
  if (pathname.startsWith("/coordinator")) {
    if (!canAccessCoordinatorRoutes(userRole)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  // Auto-redirect based on role for generic dashboard access
  if (pathname === "/dashboard") {
    const dashboardRoute = getDashboardRoute(userRole);
    if (dashboardRoute !== "/dashboard") {
      return NextResponse.redirect(new URL(dashboardRoute, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
