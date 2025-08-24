import {createTRPCRouter } from "../init";
import { userRouter } from "./user-router";
import { adminRouter } from "./admin-router";

export const appRouter = createTRPCRouter({
  user: userRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
