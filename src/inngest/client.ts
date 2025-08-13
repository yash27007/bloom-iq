import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({
  id: "bloom-iq",
  // For development, disable event key validation
  eventKey:
    process.env.NODE_ENV === "development"
      ? undefined
      : process.env.INNGEST_EVENT_KEY,
});
