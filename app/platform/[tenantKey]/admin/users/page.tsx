"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Account } from "@iblai/iblai-js/web-containers/next";
import { InviteUserDialog, InvitedUsersDialog } from "@iblai/iblai-js/web-containers";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/sis/page-header";
import { useSession } from "@/hooks/use-session";
import config from "@/lib/iblai/config";

/**
 * Users · Groups · Roles · Policies · Teams · Alerts — the SDK's Management
 * surface. The four seeded CRM roles (Viewer / User / Manager / Inviter) are
 * assigned here on the Roles and Policies tabs.
 */
export default function AdminUsersPage() {
  const t = useTranslations("admin.users");
  const router = useRouter();
  const { tenantKey, tenants, username, email, isAdmin, href } = useSession();
  const [showInvite, setShowInvite] = useState(false);
  const [showPending, setShowPending] = useState(false);

  return (
    <>
      <PageHeader
        icon={<ShieldCheck />}
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowPending(true)}>
              {t("pendingInvites")}
            </Button>
            <Button size="sm" className="ibl-button-primary" onClick={() => setShowInvite(true)}>
              <UserPlus data-icon="inline-start" /> {t("invite")}
            </Button>
          </>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        <Account
          tenant={tenantKey}
          tenants={tenants as never}
          username={username}
          email={email}
          mainPlatformKey={config.mainTenantKey()}
          isAdmin={isAdmin}
          authURL={config.authUrl()}
          currentPlatformBaseDomain={config.platformBaseDomain()}
          currentSPA="sis"
          onInviteClick={() => setShowInvite(true)}
          onClose={() => router.push(href())}
          targetTab="management"
          showPlatformName
          useGravatarPicFallback
        />
      </div>
      <InviteUserDialog
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        tenant={tenantKey}
      />
      {showPending ? (
        <InvitedUsersDialog onClose={() => setShowPending(false)} tenant={tenantKey} />
      ) : null}
    </>
  );
}
