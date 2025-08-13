import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { helloWorld, generateQuestions } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [helloWorld, generateQuestions],
  // Only use signing key in production
  ...(process.env.NODE_ENV === "production" && {
    signingKey: process.env.INNGEST_SIGNING_KEY,
  }),
});
