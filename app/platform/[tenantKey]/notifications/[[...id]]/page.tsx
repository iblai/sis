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
      <div className="flex min-h-0 flex-1 flex-col">
        <NotificationDisplay
          org={tenantKey}
          userId={username}
          isAdmin={isAdmin}
          selectedNotificationId={notificationId}
          className="min-h-0 flex-1"
        />
      </div>
    </>
  );
}
