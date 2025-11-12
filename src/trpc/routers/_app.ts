import { createTRPCRouter } from "../init";
import { userRouter } from "./user-router";
import { adminRouter } from "./admin-router";
import { coordinatorRouter } from "./coordinator-router";

export const appRouter = createTRPCRouter({
  user: userRouter,
  admin: adminRouter,
  coordinator: coordinatorRouter,
});

export type AppRouter = typeof appRouter;
