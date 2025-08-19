"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";

export default function Page() {
  const trpc = useTRPC();

  // Query example
  const { data } = useQuery(
    trpc.hello.queryOptions({ text: "Yashwanth Aravind" })
  );

  // Mutation example
  const logMutation = useMutation(trpc.log.mutationOptions());

  return (
    <div>
      <h1>Welcome to Bloom IQ</h1>
      <p>Your one-stop solution for all your blooming needs.</p>
      {data?.greeting}

      <button
        onClick={() =>
          logMutation.mutate({ message: "Hello from server bro" })
        }
        disabled={logMutation.isPending}
      >
        {logMutation.isPending ? "Sending..." : "Send log message"}
      </button>

      {logMutation.isError && <p>Error: {logMutation.error.message}</p>}
      {logMutation.isSuccess && <p>Message logged successfully!</p>}
    </div>
  );
}
