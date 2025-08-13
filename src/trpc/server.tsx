import 'server-only';
import { createCallerFactory } from './init';
import { cache } from 'react';
import { createTRPCContext } from './context';
import { appRouter } from './routers/_app';

const createCaller = createCallerFactory(appRouter);

// Create a server-side tRPC caller
export const trpc = cache(async () => {
  const context = await createTRPCContext({
    req: new Request('http://localhost:3000'),
    resHeaders: new Headers(),
    info: {
      isBatchCall: false,
      calls: [],
      accept: 'application/jsonl',
      type: 'query',
      connectionParams: {},
      signal: new AbortController().signal,
      url: new URL('http://localhost:3000'),
    },
  });

  return createCaller(context);
});
