"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/sis/empty-state";
import { LoadError } from "@/components/sis/load-error";
import { EntityAvatar } from "@/components/sis/entity-avatar";
import { UserPicker } from "@/components/sis/user-picker";
import { useIsLiveAdmin } from "@/components/sis/admin-mode";
import { useSession } from "@/hooks/use-session";
import { useToastError } from "@/hooks/use-toast-error";
import {
  useAddWatcherMutation,
  useCreateWatchedGroupMutation,
  useRemoveWatcherMutation,
  useWatchedGroupsQuery,
} from "@/lib/sis/api";
import { displayName } from "@/lib/sis/format";
import type { DirectoryUser } from "@/lib/sis/types";

/**
 * Guardians are watchers of a DM watched group that holds the student: they
 * receive copies of the learner's notifications. A guardian must already be
 * a platform user (invite them first).
 */
export function GuardiansTab({ username, userId }: { username: string; userId?: number }) {
  const t = useTranslations("guardians");
  const { tenantKey } = useSession();
  const isLiveAdmin = useIsLiveAdmin();
  const toastError = useToastError();
  const groups = useWatchedGroupsQuery({ platformKey: tenantKey, limit: 100 });
  const [picked, setPicked] = useState<DirectoryUser | null>(null);
  const [createGroup, createState] = useCreateWatchedGroupMutation();
  const [addWatcher, addState] = useAddWatcherMutation();
  const [removeWatcher, removeState] = useRemoveWatcherMutation();
  const mine = (groups.data?.results ?? []).filter((g) =>
    g.watched_users.some((u) => u.username === username),
  );
  const watchers = mine.flatMap((g) => g.watchers.map((w) => ({ ...w, groupId: g.id })));
  const busy = createState.isLoading || addState.isLoading;

  const add = async () => {
    if (!picked) return;
    try {
      if (mine[0]) {
        await addWatcher({
          platformKey: tenantKey,
          groupId: mine[0].id,
          watcher_id: picked.id,
        }).unwrap();
      } else {
        if (!userId) return;
        await createGroup({
          platformKey: tenantKey,
          name: t("groupName", { username }),
          watched_users: [userId],
          watchers: [{ watcher_id: picked.id }],
        }).unwrap();
      }
      toast.success(t("added"));
      setPicked(null);
    } catch (err) {
      toastError(err);
    }
  };

  const remove = async (groupId: number, id: number) => {
    try {
      await removeWatcher({ platformKey: tenantKey, groupId, id }).unwrap();
      toast.success(t("removed"));
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-xs">{t("hint")}</p>
      {isLiveAdmin ? (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4">
          <div className="min-w-64 flex-1">
            <UserPicker value={picked} onChange={setPicked} placeholder={t("pickUser")} />
          </div>
          <Button
            className="ibl-button-primary"
            disabled={!picked || busy || !userId}
            onClick={() => void add()}
          >
            {busy ? (
              <Spinner size="sm" className="size-4 text-current" />
            ) : (
              <Plus data-icon="inline-start" />
            )}
            {t("add")}
          </Button>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white">
        {groups.error ? (
          <LoadError error={groups.error} />
        ) : groups.isLoading ? (
          <Skeleton className="m-4 h-24 rounded-lg" />
        ) : watchers.length === 0 ? (
          <EmptyState
            icon={<UsersRound strokeWidth={1.75} />}
            title={t("none")}
            className="border-0"
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {watchers.map((w) => (
              <li
                key={`${w.groupId}-${w.id}`}
                className="flex items-center gap-3 px-4 py-2.5 text-sm"
              >
                <EntityAvatar name={displayName(w)} seed={w.username} size="sm" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium text-gray-900">{displayName(w)}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{w.email}</span>
                </span>
                {w.events?.length ? (
                  <span className="text-muted-foreground hidden text-xs sm:inline">
                    {w.events.join(", ")}
                  </span>
                ) : null}
                {isLiveAdmin ? (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={removeState.isLoading}
                    onClick={() => void remove(w.groupId, w.id)}
                    aria-label={t("remove")}
                  >
                    <X />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
