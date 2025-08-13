import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { type FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";

export async function createTRPCContext(
  opts: CreateNextContextOptions | FetchCreateContextFnOptions
) {
  // For API routes using fetch adapter
  if ("req" in opts && opts.req instanceof Request) {
    const session = await getServerSession(authOptions);
    return {
      session,
      req: opts.req,
    };
  }

  // For pages using next adapter (legacy)
  const { req, res } = opts as CreateNextContextOptions;
  const session = await getServerSession(req, res, authOptions);

  return {
    session,
    req,
    res,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
