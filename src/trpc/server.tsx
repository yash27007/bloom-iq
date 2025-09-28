import 'server-only'; // <-- ensure this file cannot be imported from the client
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { cache } from 'react';
import { createContextInner } from './context';
import { makeQueryClient } from './query-client';
import { appRouter } from './routers/_app';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);

// tRPC proxy for server components (prefetching, etc.)
export const trpc = createTRPCOptionsProxy({
  ctx: createContextInner,
  router: appRouter,
  queryClient: getQueryClient,
});

// Direct caller for server components when you need the actual data
export const createCaller = async () => {
  const ctx = await createContextInner();
  return appRouter.createCaller(ctx);
};

// Helper functions for prefetching and hydration (following tRPC docs)
export function HydrateClient(props: { children: ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}
