import 'server-only'; // <-- ensure this file cannot be imported from the client
import { cache } from 'react';
import { createContextInner } from './context';
import { makeQueryClient } from './query-client';
import { appRouter } from './routers/_app';
import { dehydrate, HydrationBoundary} from '@tanstack/react-query';
import { TRPCQueryOptions } from '@trpc/tanstack-react-query';

// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);

// Create a server-side caller using the inner context
// This approach is recommended by tRPC for server-side calls
export const serverTrpc = cache(async () => {
  const context = await createContextInner();
  return appRouter.createCaller(context);
});

export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
  queryOptions: T,
) {
  const queryClient = getQueryClient();
  if (queryOptions.queryKey[1]?.type === 'infinite') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void queryClient.prefetchInfiniteQuery(queryOptions as any);
  } else {
    void queryClient.prefetchQuery(queryOptions);
  }
}