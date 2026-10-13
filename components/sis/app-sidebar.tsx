"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Award,
  BookOpen,
  FileChartColumn,
  GraduationCap,
  Home,
  IdCard,
  Megaphone,
  Search,
  Settings,
  UserCog,
  Users,
  UsersRound,
} from "lucide-react";
import {
  PlatformSidebar,
  useSidebar,
  type PlatformSidebarFooterActionId,
  type PlatformSidebarSectionConfig,
} from "@iblai/iblai-js/web-containers/next";
import { useAccountSheet } from "@/components/sis/account-sheet";
import { useAdminMode } from "@/components/sis/admin-mode";
import { AdminModeSwitch } from "@/components/sis/admin-mode-switch";
import { useCommandPalette } from "@/components/sis/command-palette";
import { LanguageMenu } from "@/components/sis/language-menu";
import { NavRow } from "@/components/sis/nav-row";
import { useSession } from "@/hooks/use-session";
import config from "@/lib/iblai/config";
import { tenantDisplayName } from "@/lib/iblai/tenant";

/**
 * The SDK's cross-SPA sidebar shell with this app's content: Search as the
 * primary action, the school's objects as flat rows (a student sees home and
 * courses), Setup for admins in Admin mode, and the SDK footer cluster
 * (Notifications, Invites, Management, …).
 */
export function AppSidebar() {
  const t = useTranslations("nav");
  const router = useRouter();
  const { tenantKey, isAdmin, currentTenant, href, username } = useSession();
  const { adminMode } = useAdminMode();
  const { isMobile, setOpenMobile } = useSidebar();
  const { open: openPalette } = useCommandPalette();
  const { openTab, openInvite } = useAccountSheet();
  const isLiveAdmin = isAdmin && adminMode;

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
        { id: "grades", label: t("grades"), path: "/grades", icon: GraduationCap },
        { id: "credentials", label: t("credentials"), path: "/credentials", icon: Award },
        { id: "reports", label: t("reports"), path: "/reports", icon: FileChartColumn },
        { id: "messages", label: t("messages"), path: "/messages", icon: Megaphone },
      ]
    : [
        { id: "home", label: t("home"), path: "", icon: Home, exact: true },
        { id: "courses", label: t("courses"), path: "/courses", icon: BookOpen },
        {
          id: "details",
          label: t("details"),
          path: `/students/${encodeURIComponent(username)}`,
          icon: IdCard,
        },
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
    else if (id === "invites") openInvite();
    else openTab(id);
  };

  return (
    <PlatformSidebar
      logo={
        <Link href={href()} aria-label={t("home")} onClick={() => isMobile && setOpenMobile(false)}>
          {/* The platform's logo; the DM serves ibl.ai's when the platform has none. */}
          <Image
            src={`${config.dmUrl()}/api/core/orgs/${encodeURIComponent(tenantKey)}/logo/`}
            alt={tenantDisplayName(currentTenant)}
            width={120}
            height={40}
            unoptimized
            className="h-8 w-auto max-w-full object-contain"
          />
        </Link>
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
  );
}
