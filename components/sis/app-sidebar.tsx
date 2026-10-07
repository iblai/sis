"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Award,
  BookOpen,
  CalendarCheck2,
  FileChartColumn,
  GraduationCap,
  Home,
  Megaphone,
  Search,
  Settings,
  UserCog,
  Users,
  UsersRound,
} from "lucide-react";
import {
  PlatformAccountSheet,
  PlatformSidebar,
  useSidebar,
  type PlatformAccountTab,
  type PlatformSidebarFooterActionId,
  type PlatformSidebarSectionConfig,
} from "@iblai/iblai-js/web-containers/next";
import { InviteUserDialog } from "@iblai/iblai-js/web-containers";
import { useAdminMode } from "@/components/sis/admin-mode";
import { AdminModeSwitch } from "@/components/sis/admin-mode-switch";
import { useCommandPalette } from "@/components/sis/command-palette";
import { LanguageMenu } from "@/components/sis/language-menu";
import { NavRow } from "@/components/sis/nav-row";
import { useSession } from "@/hooks/use-session";
import config from "@/lib/iblai/config";

/**
 * The SDK's cross-SPA sidebar shell with this app's content: Search as the
 * primary action, the school's objects as flat rows (a student sees home and
 * courses), Setup for admins in Admin mode, and the SDK footer cluster
 * (Notifications, Invites, Management, …).
 */
export function AppSidebar() {
  const t = useTranslations("nav");
  const router = useRouter();
  const { tenantKey, username, email, isAdmin, currentTenant, href } = useSession();
  const { adminMode } = useAdminMode();
  const { isMobile, setOpenMobile } = useSidebar();
  const { open: openPalette } = useCommandPalette();
  const isLiveAdmin = isAdmin && adminMode;
  const [accountTab, setAccountTab] = useState<PlatformAccountTab | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const go = (path: string) => {
    router.push(href(path));
    if (isMobile) setOpenMobile(false);
  };

  const rows = isAdmin
    ? [
        { id: "home", label: t("home"), path: "", icon: Home, exact: true },
        { id: "students", label: t("students"), path: "/students", icon: Users },
        { id: "staff", label: t("staff"), path: "/staff", icon: UserCog },
        { id: "courses", label: t("courses"), path: "/courses", icon: BookOpen },
        { id: "groups", label: t("groups"), path: "/groups", icon: UsersRound },
        { id: "attendance", label: t("attendance"), path: "/attendance", icon: CalendarCheck2 },
        { id: "grades", label: t("grades"), path: "/grades", icon: GraduationCap },
        { id: "credentials", label: t("credentials"), path: "/credentials", icon: Award },
        { id: "reports", label: t("reports"), path: "/reports", icon: FileChartColumn },
        { id: "messages", label: t("messages"), path: "/messages", icon: Megaphone },
      ]
    : [
        { id: "home", label: t("home"), path: "", icon: Home, exact: true },
        { id: "courses", label: t("courses"), path: "/courses", icon: BookOpen },
      ];

  const sections: PlatformSidebarSectionConfig[] = [
    {
      type: "custom",
      id: "objects",
      render: (ctx) => (
        <div className="flex flex-col gap-0.5">
          {rows.map((row) => (
            <NavRow
              key={row.id}
              collapsed={ctx.collapsed}
              icon={row.icon}
              label={row.label}
              href={href(row.path)}
              exact={row.exact}
              onAfterNav={ctx.onAfterNav}
            />
          ))}
        </div>
      ),
    },
  ];
  if (isLiveAdmin) {
    sections.push({ type: "divider", id: "admin-divider" });
    sections.push({
      type: "custom",
      id: "admin",
      render: (ctx) => (
        <NavRow
          collapsed={ctx.collapsed}
          icon={Settings}
          label={t("setup")}
          href={href("/setup")}
          onAfterNav={ctx.onAfterNav}
        />
      ),
    });
  }

  // The top bar's switch and language menu are desktop-only; the sheet carries them on phones.
  if (isMobile) {
    sections.push({ type: "divider", id: "preferences-divider" });
    sections.push({
      type: "custom",
      id: "preferences",
      render: () => (
        <div className="flex items-center justify-between gap-3 px-2 py-1">
          <LanguageMenu className="flex items-center gap-1" />
          <AdminModeSwitch />
        </div>
      ),
    });
  }

  // The SDK closes the sheet only for its own navigation; dialogs opened from here must close it first.
  const onFooterAction = (id: PlatformSidebarFooterActionId) => {
    if (isMobile) setOpenMobile(false);
    if (id === "notifications") go("/notifications");
    else if (id === "management") go("/admin/users");
    else if (id === "invites") setInviteOpen(true);
    else setAccountTab(id);
  };

  return (
    <>
      <PlatformSidebar
        logo={
          <span className="flex items-center gap-1.5 px-1">
            <Image
              src="/images/iblai-logo.png"
              alt="ibl.ai"
              width={60}
              height={20}
              className="h-4 w-auto"
            />
            <span className="text-muted-foreground text-[11px]">/sis</span>
          </span>
        }
        primaryAction={{
          label: t("search"),
          icon: Search,
          onClick: () => {
            if (isMobile) setOpenMobile(false);
            openPalette();
          },
        }}
        sections={sections}
        footer={{
          isAdmin,
          isLiveAdmin,
          enableRbac: false,
          rbacPermissions: {},
          tenantKey,
          currentTenant: {
            key: tenantKey,
            enable_monetization: currentTenant?.enable_monetization ?? false,
          },
          notificationsAllowed: true,
          invitesUserTypeAllowed: true,
          supportUrl: config.documentationUrl(),
          onAction: onFooterAction,
        }}
      />
      <PlatformAccountSheet
        tab={accountTab}
        onClose={() => setAccountTab(null)}
        tenantKey={tenantKey}
        username={username}
        email={email}
        onInviteClick={() => setInviteOpen(true)}
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
    </>
  );
}
