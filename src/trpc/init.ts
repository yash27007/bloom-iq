import { initTRPC, TRPCError } from "@trpc/server";
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

// Allow any coordinator role (CC, MC, PC)
const isAnyCoordinator = t.middleware(({ ctx, next }) => {
  const role = ctx.session?.user?.role;
  if (
    role !== "COURSE_COORDINATOR" &&
    role !== "MODULE_COORDINATOR" &&
    role !== "PROGRAM_COORDINATOR"
  ) {
    throw new TRPCError({ message: "NOT AUTHORIZED", code: "UNAUTHORIZED" });
  }
  return next();
});

const isCourseCoordinator = t.middleware(({ ctx, next }) => {
  if (ctx.session?.user?.role !== "COURSE_COORDINATOR") {
    throw new TRPCError({ message: "NOT AUTHORIZED", code: "UNAUTHORIZED" });
  }
  return next();
});
const isModuleCoordinator = t.middleware(({ ctx, next }) => {
  if (ctx.session?.user?.role !== "MODULE_COORDINATOR") {
    throw new TRPCError({ message: "NOT AUTHORIZED", code: "UNAUTHORIZED" });
  }
  return next();
});
const isProgramCoordinator = t.middleware(({ ctx, next }) => {
  if (ctx.session?.user?.role !== "PROGRAM_COORDINATOR") {
    throw new TRPCError({ message: "NOT AUTHORIZED", code: "UNAUTHORIZED" });
  }
  return next();
});
const isCOE = t.middleware(({ ctx, next }) => {
  if (ctx.session?.user?.role !== "CONTROLLER_OF_EXAMINATION") {
    throw new TRPCError({ message: "NOT AUTHORIZED", code: "UNAUTHORIZED" });
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

// Allow any coordinator role to access coordinator dashboard and shared features
export const coordinatorProcedure = t.procedure.use(isAuthed).use(isAnyCoordinator);

// Specific coordinator role procedures for role-specific operations
export const courseCoordinatorProcedure = t.procedure.use(isAuthed).use(isCourseCoordinator);
export const moduleCoordinatorProcedure = t.procedure.use(isAuthed).use(isModuleCoordinator);
export const programCoordinatorProcedure = t.procedure.use(isAuthed).use(isProgramCoordinator);

export const questionReviewer = t.procedure
  .use(isAuthed)
  .use(isModuleCoordinator)
  .use(isProgramCoordinator)
  .use(isCOE);
export const controllerOfExamination = t.procedure.use(isAuthed).use(isCOE);
