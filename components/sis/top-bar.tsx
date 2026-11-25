"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Menu, PanelLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { NotificationDropdown } from "@iblai/iblai-js/web-containers";
import { useSidebar } from "@iblai/iblai-js/web-containers/next";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserMenu } from "@/components/sis/user-menu";
import { AdminModeSwitch } from "@/components/sis/admin-mode-switch";
import { useAdminMode } from "@/components/sis/admin-mode";
import { CreditBadge } from "@/components/house/credit-badge";
import { Breadcrumbs } from "@/components/sis/breadcrumbs";
import { useSession } from "@/hooks/use-session";

/**
 * The top bar — the OS's navbar shape and type (h-16, white, `#D0E0FF` hairline,
 * the system font at 14 px medium `#646464`):
 * sidebar toggle + breadcrumbs on the left; the Admin switch, the credit badge,
 * the SDK notification bell and the SDK profile dropdown on the right.
 */
export function TopBar() {
  const t = useTranslations("shell");
  const router = useRouter();
  const { tenantKey, username, isAdmin, href } = useSession();
  const { adminMode } = useAdminMode();
  const { toggleSidebar, isMobile } = useSidebar();

  const handleViewNotifications = useCallback(
    (notificationId?: string) => {
      router.push(href(`/notifications/${notificationId ?? ""}`));
    },
    [router, href],
  );

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-[#D0E0FF] bg-white pr-4 pl-2 font-[ui-sans-serif,system-ui,sans-serif] md:static">
      <div className="flex min-w-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer text-[#646464]"
                onClick={toggleSidebar}
                aria-label={t("toggleSidebar")}
              />
            }
          >
            {isMobile ? <Menu className="size-5" /> : <PanelLeft className="size-5" />}
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("toggleSidebarHint")}</TooltipContent>
        </Tooltip>
        <Breadcrumbs />
      </div>
      <div className="flex items-center gap-0 md:gap-6">
        <AdminModeSwitch className="hidden md:flex" />
        <div className="flex items-center gap-2">
          <CreditBadge
            org={tenantKey}
            isLiveAdmin={isAdmin && adminMode}
            className="hidden md:flex"
          />
          {tenantKey && username ? (
            <NotificationDropdown
              org={tenantKey}
              userId={username}
              isAdmin={isAdmin}
              onViewNotifications={handleViewNotifications}
            />
          ) : null}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
