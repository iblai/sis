"use client";

import { useParams } from "next/navigation";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { NotificationDisplay } from "@iblai/iblai-js/web-containers";
import { PageHeader } from "@/components/sis/page-header";
import { useSession } from "@/hooks/use-session";

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const params = useParams<{ id?: string[] }>();
  const notificationId = params?.id?.[0];
  const { tenantKey, username, isAdmin } = useSession();

  return (
    <>
      <PageHeader icon={<Bell />} title={t("title")} description={t("description")} />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-white">
          <NotificationDisplay
            org={tenantKey}
            userId={username}
            isAdmin={isAdmin}
            selectedNotificationId={notificationId}
          />
        </div>
      </div>
    </>
  );
}
