import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Public routes that don't require authentication
    if (pathname.startsWith("/auth/signin") || pathname === "/") {
      return NextResponse.next();
    }

    // Require authentication for all other routes
    if (!token) {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    // Admin-only routes
    if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // Course coordinator routes
    if (
      pathname.startsWith("/course-coordinator") &&
      !["COURSE_COORDINATOR", "ADMIN"].includes(token.role as string)
    ) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Allow access to public routes
        if (pathname.startsWith("/auth/signin") || pathname === "/") {
          return true;
        }

        // Require token for all other routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
