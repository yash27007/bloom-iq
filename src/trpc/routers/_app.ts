import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
export const appRouter = createTRPCRouter({
  hello: baseProcedure
    .input(
      z.object({
        text: z.string(),
      }),
    )
    .query((opts) => {
      return {
        greeting: `hello ${opts.input.text}`,
      };
    }),

    log: baseProcedure
      .input(z.object({ message: z.string() }))
      .mutation((ops) => {
        console.log(ops.input);
      })
});
// export type definition of API
export type AppRouter = typeof appRouter;