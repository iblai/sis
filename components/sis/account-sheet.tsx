"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { PlatformAccountSheet, type PlatformAccountTab } from "@iblai/iblai-js/web-containers/next";
import { InviteUserDialog } from "@iblai/iblai-js/web-containers";
import { useSession } from "@/hooks/use-session";
import config from "@/lib/iblai/config";

const AccountSheetContext = createContext<{
  openTab: (tab: PlatformAccountTab) => void;
  openInvite: () => void;
}>({ openTab: () => {}, openInvite: () => {} });

/** The SDK account dialog (Management, Integrations, …) and the invite dialog, openable from anywhere in the shell. */
export function useAccountSheet() {
  return useContext(AccountSheetContext);
}

export function AccountSheetProvider({ children }: { children: ReactNode }) {
  const { tenantKey, username, email } = useSession();
  const [tab, setTab] = useState<PlatformAccountTab | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const openInvite = useCallback(() => setInviteOpen(true), []);
  const value = useMemo(() => ({ openTab: setTab, openInvite }), [openInvite]);

  return (
    <AccountSheetContext.Provider value={value}>
      {children}
      <PlatformAccountSheet
        tab={tab}
        onClose={() => setTab(null)}
        tenantKey={tenantKey}
        username={username}
        email={email}
        onInviteClick={openInvite}
        mainPlatformKey={config.mainTenantKey()}
        authUrl={config.authUrl()}
        currentSpa="sis"
        platformBaseDomain={config.platformBaseDomain()}
      />
      <InviteUserDialog
        tenant={tenantKey}
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </AccountSheetContext.Provider>
  );
}
