import { Metadata } from "next";
import { WaitlistContent } from "./WaitlistContent";

export const metadata: Metadata = {
  title: "Join Waitlist - Get Early Access",
  description:
    "Sign up for early access to Agentic Cloud. Be among the first to experience AI-powered cloud infrastructure.",
};

export default function WaitlistPage() {
  return <WaitlistContent />;
}
