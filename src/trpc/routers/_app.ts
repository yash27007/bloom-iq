import { createTRPCRouter } from "../init";
import { userRouter } from "./user";
import { courseRouter } from "./course";
import { materialRouter } from "./material";
import { questionJobRouter } from "./questionJob";
import { questionRouter } from "./question";

export const appRouter = createTRPCRouter({
  user: userRouter,
  course: courseRouter,
  material: materialRouter,
  questionJob: questionJobRouter,
  question: questionRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
