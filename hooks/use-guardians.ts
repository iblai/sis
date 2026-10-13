"use client";

import { useSession } from "@/hooks/use-session";
import { useWatchedGroupQuery, useWatchedGroupsQuery } from "@/lib/sis/api";
import { namesStudent } from "@/lib/sis/guardians";

/**
 * The student's guardians: the watchers of the watched group named after the
 * student. The DM lists groups lean (id, name, platform key), so the members
 * come from the detail route; `group` is set only when it watches the student.
 */
export function useGuardians(username: string, enabled = true) {
  const { tenantKey } = useSession();
  const groups = useWatchedGroupsQuery({ platformKey: tenantKey, limit: 100 }, { skip: !enabled });
  const candidate = groups.data?.results.find((g) => namesStudent(g.name, username));
  const detail = useWatchedGroupQuery(
    { platformKey: tenantKey, id: candidate?.id ?? 0 },
    { skip: !candidate },
  );
  const found = detail.currentData;
  const group = found?.watched_users.some((u) => u.username === username) ? found : undefined;
  return {
    group,
    watchers: group?.watchers ?? [],
    // A query that has just started reports nothing for a frame; the page gate must wait for it.
    isLoading: groups.isLoading || (!!candidate && !found && !detail.error),
    error: groups.error ?? detail.error,
  };
}
