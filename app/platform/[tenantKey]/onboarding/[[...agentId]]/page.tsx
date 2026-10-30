"use client";

import { OnboardingPage } from "@/components/house/onboarding-page";
import { useSession } from "@/hooks/use-session";

export default function Page() {
  const { tenantKey, href } = useSession();
  return <OnboardingPage org={tenantKey} home={href()} />;
}
