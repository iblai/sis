"use client";

import Link from "next/link";
import { BookOpen, Settings, Sparkles, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";

/** Shown to an admin while the school has not been set up (no `sis` metadata yet). */
export function OnboardingCard() {
  const t = useTranslations("dashboard");
  const { href } = useSession();
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="bg-gradient-to-br from-[#eef6fc] to-white px-6 py-8 md:px-10 md:py-10">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-[#0058cc] shadow-sm">
          <Sparkles className="size-5" />
        </span>
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-gray-900">
          {t("onboarding.title")}
        </h2>
        <p className="text-muted-foreground mt-1.5 max-w-lg text-sm">{t("onboarding.body")}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button className="ibl-button-primary" render={<Link href={href("/setup")} />}>
            <Settings data-icon="inline-start" /> {t("onboarding.setUp")}
          </Button>
          <Button variant="outline" render={<Link href={href("/students?invite=1")} />}>
            <UserPlus data-icon="inline-start" /> {t("onboarding.inviteStudent")}
          </Button>
          <Button variant="outline" render={<Link href={href("/courses?new=1")} />}>
            <BookOpen data-icon="inline-start" /> {t("onboarding.newSection")}
          </Button>
        </div>
      </div>
      <ol className="grid gap-px bg-gray-100 sm:grid-cols-3">
        {(["setup", "students", "sections"] as const).map((step, i) => (
          <li key={step} className="bg-white px-5 py-4">
            <span className="flex size-6 items-center justify-center rounded-full bg-[#eef6fc] text-xs font-semibold text-[#0058cc]">
              {i + 1}
            </span>
            <p className="mt-2 text-sm font-medium text-gray-900">
              {t(`onboarding.steps.${step}.title`)}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t(`onboarding.steps.${step}.body`)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
