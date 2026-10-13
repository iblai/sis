/**
 * The DM reads a record's custom fields back as a list of
 * `{slug, name, field_type, value}` (`[]` when empty) but takes them on PUT as
 * `{slug: value}`; the app keeps the PUT shape everywhere.
 */
export function customFieldsBySlug(raw: unknown): Record<string, unknown> {
  if (Array.isArray(raw)) {
    return Object.fromEntries(
      raw
        .filter((f): f is { slug: string; value?: unknown } => !!f && typeof f.slug === "string")
        .map((f) => [f.slug, f.value]),
    );
  }
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}
