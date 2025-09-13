import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { 
  helloWorld,
  processDocumentAndGenerateQuestions 
} from "@/inngest/functions-markdown";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    helloWorld,
    processDocumentAndGenerateQuestions
  ],
  // Only use signing key in production
  ...(process.env.NODE_ENV === "production" && {
    signingKey: process.env.INNGEST_SIGNING_KEY,
  }),
});
