import 'server-only'; // <-- ensure this file cannot be imported from the client
import { cache } from 'react';
import { createContextInner } from './context';
import { makeQueryClient } from './query-client';
import { appRouter } from './routers/_app';

// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);

// Create a server-side caller using the inner context
// This approach is recommended by tRPC for server-side calls
export const serverTrpc = cache(async () => {
  const context = await createContextInner();
  return appRouter.createCaller(context);
});
