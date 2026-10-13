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

/**
 * The PUT body's custom fields with a `null` for every optional field the form
 * never touched: the DM stores a row for it, and only stored rows reach the
 * student's own read. A required field stays out until it holds a value.
 */
export function withEveryField(
  custom: Record<string, unknown>,
  definitions: readonly { slug: string; required?: boolean }[],
): Record<string, unknown> {
  const untouched = Object.fromEntries(
    definitions.filter((f) => !f.required && !(f.slug in custom)).map((f) => [f.slug, null]),
  );
  return { ...untouched, ...custom };
}
