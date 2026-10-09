"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Megaphone, Pencil, Plus, Trash2, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/sis/page-header";
import { ConfirmDialog } from "@/components/sis/confirm-dialog";
import { EmptyState } from "@/components/sis/empty-state";
import { LoadError } from "@/components/sis/load-error";
import { EntityAvatar } from "@/components/sis/entity-avatar";
import { UserPicker } from "@/components/sis/user-picker";
import { useBreadcrumbs } from "@/components/sis/breadcrumbs";
import { useIsLiveAdmin } from "@/components/sis/admin-mode";
import { GroupDialog } from "@/components/sis/groups/group-dialog";
import { useSession } from "@/hooks/use-session";
import { useToastError } from "@/hooks/use-toast-error";
import {
  useDeleteUserGroupMutation,
  useLazyPlatformUsersQuery,
  useUpdateUserGroupMutation,
  useUserGroupQuery,
} from "@/lib/sis/api";
import { displayName } from "@/lib/sis/format";
import type { PlatformUser } from "@/lib/sis/types";

/** One group: its members (`users_to_set` replaces the whole list), bulk add by username, announce, delete. */
export default function GroupPage() {
  const t = useTranslations("groups.detail");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const { tenantKey, href } = useSession();
  const isLiveAdmin = useIsLiveAdmin();
  const toastError = useToastError();
  const group = useUserGroupQuery(id, { skip: !Number.isFinite(id) });
  const [update, updateState] = useUpdateUserGroupMutation();
  const [remove, removeState] = useDeleteUserGroupMutation();
  const [search] = useLazyPlatformUsersQuery();
  const [picked, setPicked] = useState<PlatformUser | null>(null);
  const [bulk, setBulk] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const users = group.data?.users ?? [];
  useBreadcrumbs([
    { label: tn("groups"), href: href("/groups") },
    { label: group.data?.name ?? String(id), href: href(`/groups/${id}`) },
  ]);

  const setMembers = async (ids: number[], message: string) => {
    try {
      await update({ id, body: { users_to_set: ids } }).unwrap();
      toast.success(message);
    } catch (err) {
      toastError(err);
    }
  };
  const add = async () => {
    if (!picked) return;
    await setMembers(
      [...new Set([...users.map((u) => u.id), picked.user_id])],
      t("added", { name: displayName(picked) }),
    );
    setPicked(null);
  };
  const addBulk = async () => {
    const names = bulk
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.length) return;
    setBulkBusy(true);
    const ids = new Set(users.map((u) => u.id));
    const missing: string[] = [];
    try {
      for (const name of names) {
        const res = await search({ platformKey: tenantKey, query: name, page_size: 5 }).unwrap();
        const hit = res.results.find((u) => u.username === name || u.email === name);
        if (hit) ids.add(hit.user_id);
        else missing.push(name);
      }
      await setMembers([...ids], t("bulkAdded", { count: names.length - missing.length }));
      if (missing.length) toast.message(t("bulkMissing", { names: missing.join(", ") }));
      setBulk("");
    } catch (err) {
      toastError(err);
    } finally {
      setBulkBusy(false);
    }
  };
  const confirmDelete = async () => {
    try {
      await remove(id).unwrap();
      toast.success(t("deleted"));
      router.push(href("/groups"));
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <>
      <PageHeader
        icon={<UsersRound />}
        title={group.data?.name ?? "…"}
        count={group.data ? users.length : undefined}
        description={group.data?.description || t("description")}
        actions={
          isLiveAdmin && group.data ? (
            <>
              <Button
                variant="outline"
                size="sm"
                render={<Link href={href(`/messages?group=${id}`)} />}
              >
                <Megaphone data-icon="inline-start" /> {t("announce")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil data-icon="inline-start" /> {tc("edit")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 data-icon="inline-start" /> {tc("delete")}
              </Button>
            </>
          ) : null
        }
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white">
            {group.error ? (
              <LoadError error={group.error} />
            ) : group.isLoading ? (
              <Skeleton className="m-4 h-32 rounded-lg" />
            ) : users.length === 0 ? (
              <EmptyState
                icon={<UsersRound strokeWidth={1.75} />}
                title={t("noMembers")}
                className="border-0"
              />
            ) : (
              <ul className="divide-y divide-gray-100">
                {users.map((u) => (
                  <li key={u.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                    <EntityAvatar name={displayName(u)} seed={u.username} size="sm" />
                    <Link
                      href={href(`/students/${encodeURIComponent(u.username)}`)}
                      className="min-w-0 flex-1 truncate font-medium text-gray-900 hover:underline"
                    >
                      {displayName(u)}
                    </Link>
                    <span className="text-muted-foreground hidden truncate text-xs sm:inline">
                      {u.email}
                    </span>
                    {isLiveAdmin ? (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={updateState.isLoading}
                        onClick={() =>
                          void setMembers(
                            users.filter((x) => x.id !== u.id).map((x) => x.id),
                            t("removed"),
                          )
                        }
                        aria-label={tc("remove")}
                      >
                        <X />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
          {isLiveAdmin ? (
            <div className="space-y-4">
              <section className="space-y-2 rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4">
                <h2 className="text-sm font-semibold text-gray-900">{t("addMember")}</h2>
                <UserPicker
                  value={picked}
                  onChange={setPicked}
                  placeholder={t("pickUser")}
                  size="sm"
                />
                <Button
                  size="sm"
                  className="ibl-button-primary"
                  disabled={!picked || updateState.isLoading}
                  onClick={() => void add()}
                >
                  <Plus data-icon="inline-start" /> {t("add")}
                </Button>
              </section>
              <section className="space-y-2 rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4">
                <h2 className="text-sm font-semibold text-gray-900">{t("bulkTitle")}</h2>
                <p className="text-muted-foreground text-xs">{t("bulkHint")}</p>
                <Textarea
                  value={bulk}
                  onChange={(e) => setBulk(e.target.value)}
                  rows={4}
                  className="font-mono text-xs"
                  placeholder={"ada\ngrace@example.org"}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!bulk.trim() || bulkBusy}
                  onClick={() => void addBulk()}
                >
                  {bulkBusy ? <Spinner size="sm" className="size-4 text-current" /> : null}
                  {t("bulkAdd")}
                </Button>
              </section>
            </div>
          ) : null}
        </div>
      </div>
      {group.data ? (
        <GroupDialog
          key={group.data.name + (group.data.description ?? "")}
          open={editOpen}
          onOpenChange={setEditOpen}
          group={group.data}
        />
      ) : null}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("deleteTitle", { name: group.data?.name ?? "" })}
        description={t("deleteBody")}
        confirmLabel={tc("delete")}
        destructive
        loading={removeState.isLoading}
        onConfirm={confirmDelete}
      />
    </>
  );
}
