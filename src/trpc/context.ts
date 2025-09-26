import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { auth } from "@/auth";

/**
 * Inner context for tRPC procedures that doesn't depend on the request.
 * This is useful for testing and server-side helpers.
 */
export async function createContextInner() {
  // Get session for inner context - this will work for server-side calls
  const session = await auth();

  return {
    session,
  };
}

/**
 * Outer context for tRPC procedures that includes request-specific data.
 * This is used for HTTP requests via the API route.
 */
export async function createTRPCContext(opts: FetchCreateContextFnOptions) {
  // For API routes, we can get the session from the request
  const session = await auth();

  return {
    ...(await createContextInner()),
    session, // Override with request-specific session if needed
    req: opts.req,
    headers: opts.req.headers,
  };
}

export type Context = Awaited<ReturnType<typeof createContextInner>>;