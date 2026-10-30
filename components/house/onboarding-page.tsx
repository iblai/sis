"use client";

import { Suspense, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bot, PartyPopper } from "lucide-react";
import {
  OnboardingWizard,
  StepHeader,
  hasOnboardingContent,
  onboardingPrimaryButtonClass,
  onboardingSecondaryButtonClass,
  readUserOnboardingForm,
  type OnboardingFinalStepContext,
} from "@iblai/iblai-js/web-containers";
import { useTenantMetadata } from "@iblai/iblai-js/web-utils";
import { SETUP_SENT } from "@/components/house/first-run-gate";
import { LoadingScreen } from "@/components/loading-screen";
import config from "@/lib/iblai/config";
import { onboardingFlow, readTenants, readUsername } from "@/lib/iblai/house-journeys";

/**
 * `/platform/[tenantKey]/onboarding/[[...agentId]]` — the SDK onboarding
 * wizard, inside the shell the way the LMS mounts it. Members get the
 * platform's own form (authored in Management › Onboarding) and its agent on
 * the last step; an admin's first run is the setup flow, which asks only what
 * no official app recorded yet (the SDK reads the platform's name and sector
 * and the admin's earlier record), and `?flow=` switches. The route file is
 * one line: `export { OnboardingPage as default } from "@/components/house/onboarding-page";`
 */
export function OnboardingPage() {
  return (
    <Suspense fallback={<LoadingScreen className="min-h-0 flex-1" />}>
      <Onboarding />
    </Suspense>
  );
}

function Onboarding() {
  const params = useParams<{ tenantKey: string; agentId?: string[] }>();
  const org = decodeURIComponent(params.tenantKey ?? "");
  const agentId = params.agentId?.[0];
  const flowParam = useSearchParams().get("flow");
  const [username] = useState(readUsername);
  const [isAdmin] = useState(() => !!readTenants().find((t) => t.key === org)?.is_admin);
  const { metadata, isLoading } = useTenantMetadata({ org });
  if (isLoading) return <LoadingScreen className="min-h-0 flex-1" />;

  const form = readUserOnboardingForm(metadata);
  const flow = onboardingFlow({
    isAdmin,
    flowParam,
    agentId,
    formReady: form.enabled && hasOnboardingContent(form),
  });
  const userFlow = flow === "user";
  const home = `/platform/${encodeURIComponent(org)}`;
  // A one-way door, left by a full navigation: the gate re-reads the record
  // and a renamed platform shows its name.
  const leave = () => {
    sessionStorage.setItem(SETUP_SENT, org);
    window.location.assign(home);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="onboarding-page">
      <OnboardingWizard
        // A switch of flow or agent link starts a fresh run.
        key={`${flow}:${agentId ?? ""}`}
        tenant={org}
        username={username}
        brandName={config.appName() || undefined}
        isAdminOnboarding={!userFlow}
        agentId={agentId}
        renderFinalStep={
          userFlow
            ? (context) => <MeetAgentStep {...context} />
            : (context) => <AllSetStep {...context} />
        }
        // An admin following a member link is looking, not answering.
        onResponsesSubmit={isAdmin && userFlow ? async () => {} : undefined}
        onComplete={leave}
      />
    </div>
  );
}

/** The member flow's last step: the agent the platform hands over, then the app. */
function MeetAgentStep({ agent, goBack, complete }: OnboardingFinalStepContext) {
  const t = useTranslations("houseJourneys.onboarding");
  return (
    <div data-testid="onboarding-final-step">
      <StepHeader
        icon={agent ? Bot : PartyPopper}
        title={agent ? agent.title || t("meetTitle", { name: agent.name ?? "" }) : t("allSetTitle")}
        subtitle={agent ? agent.description || t("meetBody") : t("allSetMember")}
      />
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => complete(agent?.mentor_unique_id ?? null)}
          className={onboardingPrimaryButtonClass}
        >
          {t("continue")}
        </button>
        <button type="button" onClick={goBack} className={onboardingSecondaryButtonClass}>
          {t("back")}
        </button>
      </div>
    </div>
  );
}

/** The setup flow's last step: the SDK ships none, so the host owns it. */
function AllSetStep({ answers, goBack, complete }: OnboardingFinalStepContext) {
  const t = useTranslations("houseJourneys.onboarding");
  return (
    <div data-testid="onboarding-final-step">
      <StepHeader
        icon={PartyPopper}
        title={t("allSetTitle")}
        subtitle={t("allSetBody", { workspace: answers.organizationName || t("workspace") })}
      />
      <div className="space-y-3">
        <button type="button" onClick={() => complete()} className={onboardingPrimaryButtonClass}>
          {t("complete")}
        </button>
        <button type="button" onClick={goBack} className={onboardingSecondaryButtonClass}>
          {t("back")}
        </button>
      </div>
    </div>
  );
}
