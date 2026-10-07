"use client";

import { useCallback, useMemo } from "react";
import { useSession } from "@/hooks/use-session";
import {
  useLazyPlatformMetadataQuery,
  usePlatformMetadataQuery,
  useUpdatePlatformMetadataMutation,
} from "@/lib/sis/api";
import {
  EMPTY_SIS_METADATA,
  SIS_METADATA_VERSION,
  parseSisMetadata,
  sameRows,
  type SisList,
  type SisMetadata,
} from "@/lib/sis/metadata";

/** Thrown by `saveList` when another admin changed the same list meanwhile. */
export class MetadataConflictError extends Error {
  constructor() {
    super("conflict");
    this.name = "MetadataConflictError";
  }
}

/**
 * The school's `sis` metadata block and the one way to write it: a list at a
 * time, written whole, after re-reading the platform metadata and refusing
 * when the list no longer matches what the form started from.
 */
// ponytail: last-writer-wins per array, compare-on-save only; move sections to a DM model when two admins edit setup at once.
export function useSisMetadata() {
  const { tenantKey } = useSession();
  const query = usePlatformMetadataQuery(tenantKey, { skip: !tenantKey });
  const [fetchLatest] = useLazyPlatformMetadataQuery();
  const [update, updateState] = useUpdatePlatformMetadataMutation();

  const parsed = useMemo(() => {
    if (!query.data) return { meta: null as SisMetadata | null, invalid: false };
    try {
      return { meta: parseSisMetadata(query.data.metadata?.sis), invalid: false };
    } catch {
      return { meta: null as SisMetadata | null, invalid: true };
    }
  }, [query.data]);

  const saveList = useCallback(
    async <K extends SisList>(list: K, rows: SisMetadata[K], base: SisMetadata[K]) => {
      const latest = await fetchLatest(tenantKey, false).unwrap();
      const current = parseSisMetadata(latest.metadata?.sis)?.[list] ?? EMPTY_SIS_METADATA[list];
      if (!sameRows(current, base)) throw new MetadataConflictError();
      await update({
        platformKey: tenantKey,
        metadata: { sis: { version: SIS_METADATA_VERSION, [list]: rows } },
      }).unwrap();
    },
    [fetchLatest, tenantKey, update],
  );

  const saveSchool = useCallback(
    async (school: SisMetadata["school"], gpaScale?: Record<string, number>) => {
      await update({
        platformKey: tenantKey,
        metadata: {
          sis: { version: SIS_METADATA_VERSION, school, ...(gpaScale ? { gpaScale } : {}) },
        },
      }).unwrap();
    },
    [tenantKey, update],
  );

  return {
    meta: parsed.meta,
    /** The block exists but its version is unknown. */
    invalid: parsed.invalid,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    saveList,
    saveSchool,
    isSaving: updateState.isLoading,
  };
}
