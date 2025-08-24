import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's a protected route
  const isAdminRoute = pathname.startsWith("/admin");
  const isCoordinatorRoute = pathname.startsWith("/coordinator");

  if (isAdminRoute || isCoordinatorRoute) {
    // Check for session token
    const token =
      request.cookies.get("authjs.session-token") ||
      request.cookies.get("__Secure-authjs.session-token");

    if (!token) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sign-in (login page)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sign-in).*)",
  ],
};
