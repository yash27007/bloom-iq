import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  canAccessAdminRoutes,
  canAccessCoordinatorRoutes,
  getDashboardRoute,
  type UserRole,
} from "@/lib/auth-utils";

export async function proxy(request: NextRequest) {
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

  // Routes that handle their own authentication (to avoid body consumption issues)
  const selfAuthRoutes = [
    "/api/upload", // File upload with FormData
    "/api/auth", // Auth routes
  ];

  // Check if the route handles its own authentication
  const isSelfAuthRoute = selfAuthRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isSelfAuthRoute) {
    return NextResponse.next();
  }

  // Check if the route is public or starts with a public path
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Now we can safely call auth() for protected routes
  const session = await auth();

  // Redirect to sign-in if no session
  if (!session?.user) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check if user account is active
  if (!session.user.isActive) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // Role-based route protection
  const userRole = session.user.role as UserRole;

  // Redirect COE users from /coe/dashboard to /coordinator/dashboard
  if (pathname.startsWith("/coe/dashboard")) {
    if (userRole === "CONTROLLER_OF_EXAMINATION") {
      // Replace /coe/dashboard with /coordinator/dashboard
      const newPath = pathname.replace("/coe/dashboard", "/coordinator/dashboard");
      return NextResponse.redirect(new URL(newPath, request.url));
    } else {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

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
