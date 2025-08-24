import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context"; 

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

// --------------------
// Middleware
// --------------------

// Require logged in
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new Error("Not authenticated");
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.session.user,
    },
  });
});

// Require admin
const isAdmin = t.middleware(({ ctx, next }) => {
  if (ctx.session?.user?.role !== "ADMIN") {
    throw new Error("Not authorized");
  }
  return next();
});

// --------------------
// Base helpers
// --------------------
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// Procedures
export const baseProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
export const adminProcedure = t.procedure.use(isAuthed).use(isAdmin);
