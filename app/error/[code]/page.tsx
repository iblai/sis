"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { NOTICE_PRIMARY, NOTICE_SECONDARY, NoticeCard } from "@/components/notice-card";
import { handleLogout } from "@/lib/iblai/auth-utils";

const MESSAGES: Record<string, "badRequest" | "forbidden" | "notFound"> = {
  "400": "badRequest",
  "403": "forbidden",
  "404": "notFound",
};

export default function ErrorPage() {
  return (
    <Suspense>
      <ErrorNotice />
    </Suspense>
  );
}

/** `?tenant=` names the platform that refused the sign-in (the TenantProvider's 403). */
function ErrorNotice() {
  const t = useTranslations("errors");
  const tc = useTranslations("common");
  const { code } = useParams<{ code: string }>();
  const tenant = useSearchParams().get("tenant") ?? "";
  const key = Object.hasOwn(MESSAGES, code) ? MESSAGES[code] : undefined;
  const message = key
    ? {
        title: t(`${key}.title`),
        body:
          key === "forbidden" && tenant
            ? t("forbidden.bodyNamed", { platform: tenant })
            : t(`${key}.body`),
      }
    : { title: tc("errorGeneric"), body: t("fallbackBody") };
  return (
    <NoticeCard
      eyebrow={t("code", { code: key ? code : "—" })}
      title={message.title}
      body={message.body}
    >
      <Link href="/" className={NOTICE_SECONDARY}>
        {t("goHome")}
      </Link>
      <button type="button" onClick={() => handleLogout()} className={NOTICE_PRIMARY}>
        {t("signInAgain")}
      </button>
    </NoticeCard>
  );
}
