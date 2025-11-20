import { createTRPCRouter } from "../init";
import { userRouter } from "./user-router";
import { adminRouter } from "./admin-router";
import { coordinatorRouter } from "./coordinator-router";
import { questionApprovalRouter } from "./question-approval-router";
import { questionBankRouter } from "./question-bank-router";
import { patternRouter } from "./pattern-router";
import { paperRouter } from "./paper-router";

export const appRouter = createTRPCRouter({
  user: userRouter,
  admin: adminRouter,
  coordinator: coordinatorRouter,
  questionApproval: questionApprovalRouter,
  questionBank: questionBankRouter,
  pattern: patternRouter,
  paper: paperRouter,
});

export type AppRouter = typeof appRouter;
