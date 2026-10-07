"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAdminMode } from "@/components/sis/admin-mode";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

/** User / Admin view switch for org admins. Renders nothing for members. */
export function AdminModeSwitch({ className }: { className?: string }) {
  const t = useTranslations("shell");
  const tc = useTranslations("common");
  const { isAdmin, adminMode, setAdminMode } = useAdminMode();
  const { href } = useSession();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  if (!isAdmin) return null;
  return (
    <div
      className={cn("text-muted-foreground flex items-center gap-2 text-xs font-medium", className)}
    >
      <span className={adminMode ? "" : "text-[#0058cc]"}>{tc("user")}</span>
      <Tooltip>
        <TooltipTrigger
          render={
            <Switch
              checked={adminMode}
              onCheckedChange={(on: boolean) => {
                setAdminMode(on);
                if (!on && /\/(admin|setup)(\/|$)/.test(pathname)) router.push(href());
              }}
              aria-label={t("adminMode")}
              className="data-[checked]:bg-[#0058cc]"
            />
          }
        />
        <TooltipContent side="bottom">{t("adminModeHint")}</TooltipContent>
      </Tooltip>
      <span className={adminMode ? "text-[#0058cc]" : ""}>{tc("admin")}</span>
    </div>
  );
}
