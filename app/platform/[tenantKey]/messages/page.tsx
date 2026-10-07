"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Mail, Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/sis/page-header";
import { LoadError } from "@/components/sis/load-error";
import { LoadingScreen } from "@/components/loading-screen";
import { SimpleSelect } from "@/components/sis/simple-select";
import { useBreadcrumbs } from "@/components/sis/breadcrumbs";
import { useSections } from "@/hooks/use-sections";
import { useSession } from "@/hooks/use-session";
import { useToastError } from "@/hooks/use-toast-error";
import {
  usePreviewNotificationMutation,
  useSendNotificationMutation,
  useUserGroupsQuery,
} from "@/lib/sis/api";
import { useEmailSchedulesQuery, useSendEmailMutation } from "@/lib/sis/lms-api";
import { formatDateTime } from "@/lib/sis/format";
import type { NotificationPreview, NotificationSourceType } from "@/lib/sis/types";

export default function MessagesPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MessagesView />
    </Suspense>
  );
}

/** Section email through the LMS instructor API; platform announcements through the DM notification builder. */
function MessagesView() {
  const t = useTranslations("messages");
  const tn = useTranslations("nav");
  const searchParams = useSearchParams();
  const { href } = useSession();
  useBreadcrumbs([{ label: tn("messages"), href: href("/messages") }]);
  return (
    <>
      <PageHeader icon={<Megaphone />} title={tn("messages")} description={t("description")} />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionEmail initialCourseId={searchParams.get("course") ?? ""} />
          <Announcement initialGroupId={searchParams.get("group") ?? ""} />
        </div>
      </div>
    </>
  );
}

function SectionEmail({ initialCourseId }: { initialCourseId: string }) {
  const t = useTranslations("messages.email");
  const locale = useLocale();
  const toastError = useToastError();
  const sections = useSections();
  const [courseId, setCourseId] = useState(initialCourseId);
  const [toLearners, setToLearners] = useState(true);
  const [toStaff, setToStaff] = useState(false);
  const [toMyself, setToMyself] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [schedule, setSchedule] = useState("");
  const [send, { isLoading }] = useSendEmailMutation();
  const schedules = useEmailSchedulesQuery(courseId, { skip: !courseId });
  const audience = [toMyself && "myself", toStaff && "staff", toLearners && "learners"].filter(
    Boolean,
  ) as string[];

  const submit = async () => {
    if (!courseId || !subject.trim() || !message.trim() || !audience.length) return;
    try {
      await send({
        courseId,
        send_to: audience,
        subject: subject.trim(),
        message,
        schedule: schedule ? new Date(schedule).toISOString() : undefined,
      }).unwrap();
      toast.success(schedule ? t("scheduled") : t("sent"));
      setSubject("");
      setMessage("");
      setSchedule("");
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Mail className="size-4" /> {t("title")}
        </h2>
        <p className="text-muted-foreground text-xs">{t("hint")}</p>
      </div>
      <div className="space-y-1.5">
        <Label>{t("section")}</Label>
        <SimpleSelect
          value={courseId}
          onChange={setCourseId}
          options={sections.rows.map((r) => ({ value: r.course.id, label: r.course.name }))}
          placeholder={t("pickSection")}
        />
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <Checkbox checked={toLearners} onCheckedChange={(v) => setToLearners(Boolean(v))} />{" "}
          {t("learners")}
        </label>
        <label className="flex items-center gap-1.5">
          <Checkbox checked={toStaff} onCheckedChange={(v) => setToStaff(Boolean(v))} />{" "}
          {t("staff")}
        </label>
        <label className="flex items-center gap-1.5">
          <Checkbox checked={toMyself} onCheckedChange={(v) => setToMyself(Boolean(v))} />{" "}
          {t("myself")}
        </label>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email-subject">{t("subject")}</Label>
        <Input id="email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email-message">{t("message")}</Label>
        <Textarea
          id="email-message"
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email-schedule">{t("schedule")}</Label>
        <Input
          id="email-schedule"
          type="datetime-local"
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          className="w-60"
        />
      </div>
      <div className="flex justify-end">
        <Button
          className="ibl-button-primary"
          disabled={
            isLoading || !courseId || !subject.trim() || !message.trim() || !audience.length
          }
          onClick={() => void submit()}
        >
          {isLoading ? (
            <Spinner size="sm" className="size-4 text-current" />
          ) : (
            <Send data-icon="inline-start" />
          )}
          {schedule ? t("scheduleSend") : t("send")}
        </Button>
      </div>
      {courseId ? (
        <div>
          <p className="text-muted-foreground text-xs font-medium">{t("scheduledTitle")}</p>
          {schedules.error ? (
            <LoadError error={schedules.error} className="py-4" />
          ) : schedules.isLoading ? (
            <Skeleton className="mt-1 h-8" />
          ) : (schedules.data?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground mt-1 text-sm">—</p>
          ) : (
            <ul className="mt-1 space-y-1 text-xs">
              {(schedules.data as Record<string, unknown>[]).map((s, i) => {
                const task = (s.task as Record<string, unknown> | undefined) ?? {};
                const email = (s.courseEmail as Record<string, unknown> | undefined) ?? {};
                return (
                  <li key={String(s.id ?? i)} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">
                      {String(email.subject ?? task.task_type ?? t("scheduledItem"))}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDateTime(String(s.schedule ?? task.task_state ?? ""), locale)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}

function Announcement({ initialGroupId }: { initialGroupId: string }) {
  const t = useTranslations("messages.announcement");
  const { tenantKey } = useSession();
  const toastError = useToastError();
  const groups = useUserGroupsQuery({ platformKey: tenantKey, page_size: 100 });
  const [audience, setAudience] = useState<"platform" | "usergroup" | "username">(
    initialGroupId ? "usergroup" : "platform",
  );
  const [groupId, setGroupId] = useState(initialGroupId);
  const [usernames, setUsernames] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState(true);
  const [inApp, setInApp] = useState(true);
  const [preview, setPreview] = useState<NotificationPreview | null>(null);
  const [runPreview, previewState] = usePreviewNotificationMutation();
  const [runSend, sendState] = useSendNotificationMutation();
  const channels = [email && "email", inApp && "in_app"].filter(Boolean) as string[];

  const source = (): { type: NotificationSourceType; data: unknown } | null => {
    if (audience === "platform") return { type: "platform", data: tenantKey };
    if (audience === "usergroup")
      return groupId ? { type: "usergroup", data: Number(groupId) } : null;
    const names = usernames
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return names.length ? { type: "username", data: names } : null;
  };

  const doPreview = async () => {
    const s = source();
    if (!s || !title.trim() || !body.trim() || !channels.length) return;
    try {
      const res = await runPreview({
        platformKey: tenantKey,
        body: {
          channels,
          sources: [s],
          template_data: { message_title: title.trim(), message_body: body },
        },
      }).unwrap();
      setPreview(res);
    } catch (err) {
      toastError(err);
    }
  };
  const doSend = async () => {
    if (!preview) return;
    try {
      const res = await runSend({ platformKey: tenantKey, build_id: preview.build_id }).unwrap();
      toast.success(t("sent", { count: res.notifications_sent }));
      setPreview(null);
      setTitle("");
      setBody("");
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Megaphone className="size-4" /> {t("title")}
        </h2>
        <p className="text-muted-foreground text-xs">{t("hint")}</p>
      </div>
      <div className="space-y-1.5">
        <Label>{t("audience")}</Label>
        <SimpleSelect
          value={audience}
          onChange={(v) => {
            setAudience(v as typeof audience);
            setPreview(null);
          }}
          options={[
            { value: "platform", label: t("everyone") },
            { value: "usergroup", label: t("group") },
            { value: "username", label: t("usernames") },
          ]}
        />
      </div>
      {audience === "usergroup" ? (
        <SimpleSelect
          value={groupId}
          onChange={(v) => {
            setGroupId(v);
            setPreview(null);
          }}
          options={(groups.data?.results ?? []).map((g) => ({
            value: String(g.id),
            label: g.name,
          }))}
          placeholder={t("pickGroup")}
        />
      ) : null}
      {audience === "username" ? (
        <Textarea
          value={usernames}
          onChange={(e) => setUsernames(e.target.value)}
          rows={3}
          placeholder={"ada\ngrace"}
          className="font-mono text-xs"
          aria-label={t("usernames")}
        />
      ) : null}
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <Checkbox checked={email} onCheckedChange={(v) => setEmail(Boolean(v))} />{" "}
          {t("channelEmail")}
        </label>
        <label className="flex items-center gap-1.5">
          <Checkbox checked={inApp} onCheckedChange={(v) => setInApp(Boolean(v))} />{" "}
          {t("channelInApp")}
        </label>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="announce-title">{t("subject")}</Label>
        <Input id="announce-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="announce-body">{t("body")}</Label>
        <Textarea
          id="announce-body"
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      {preview ? (
        <p className="rounded-lg border border-[#cfe8fa] bg-[#eef6fc] px-3 py-2 text-xs text-gray-800">
          {t("previewCount", { count: preview.count })}
          {preview.warning ? ` · ${preview.warning}` : ""}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          disabled={
            previewState.isLoading || !source() || !title.trim() || !body.trim() || !channels.length
          }
          onClick={() => void doPreview()}
        >
          {previewState.isLoading ? <Spinner size="sm" className="size-4 text-current" /> : null}
          {t("preview")}
        </Button>
        <Button
          className="ibl-button-primary"
          disabled={!preview || sendState.isLoading}
          onClick={() => void doSend()}
        >
          {sendState.isLoading ? (
            <Spinner size="sm" className="size-4 text-current" />
          ) : (
            <Send data-icon="inline-start" />
          )}
          {t("send")}
        </Button>
      </div>
    </section>
  );
}
