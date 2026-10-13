import type { FieldDefinitionWrite } from "./types";

/** Country of residence has no DM column: the platform custom field of this slug, an alpha-3 code. */
export const RESIDENCE = "country_of_residence";

/** Its seed row; the record form creates it on the first save that carries a value. */
export const RESIDENCE_FIELD: FieldDefinitionWrite = {
  slug: RESIDENCE,
  name: "Country of Residence",
  field_type: "text",
  required: false,
  display_order: 12,
  active: true,
};

/** The slugs the app seeds; a platform may store them under an older name. */
export const SEED_SLUGS = [
  "student_id",
  "grade_level",
  "enrollment_status",
  "homeroom",
  "guardian_name",
  "guardian_relationship",
  "guardian_phone",
  "guardian_email",
  "emergency_contact_name",
  "emergency_contact_phone",
  "medical_notes",
  RESIDENCE,
] as const;
export type SeedSlug = (typeof SEED_SLUGS)[number];
export const isSeedSlug = (slug: string): slug is SeedSlug =>
  (SEED_SLUGS as readonly string[]).includes(slug);

/** The `enrollment_status` choices, shown through `students.enrollmentStatus`. */
export const ENROLLMENT_STATUSES = ["active", "withdrawn", "graduated", "transferred"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];
export const isEnrollmentStatus = (value: string): value is EnrollmentStatus =>
  (ENROLLMENT_STATUSES as readonly string[]).includes(value);

/** The student-record fields the school starts with; seeded by slug, idempotently. */
export function seedFieldDefinitions(gradeLevels: readonly string[]): FieldDefinitionWrite[] {
  const text = (
    slug: string,
    name: string,
    order: number,
    required = false,
  ): FieldDefinitionWrite => ({
    slug,
    name,
    field_type: "text",
    required,
    display_order: order,
    active: true,
  });
  return [
    text("student_id", "Student ID", 1, true),
    {
      slug: "grade_level",
      name: "Grade Level",
      field_type: "select",
      required: true,
      choices: [...gradeLevels],
      display_order: 2,
      active: true,
    },
    {
      slug: "enrollment_status",
      name: "Enrollment Status",
      field_type: "select",
      required: true,
      choices: [...ENROLLMENT_STATUSES],
      display_order: 3,
      active: true,
    },
    text("homeroom", "Homeroom", 4),
    text("guardian_name", "Guardian Name", 5),
    text("guardian_relationship", "Guardian Relationship", 6),
    text("guardian_phone", "Guardian Phone", 7),
    text("guardian_email", "Guardian Email", 8),
    text("emergency_contact_name", "Emergency Contact Name", 9),
    text("emergency_contact_phone", "Emergency Contact Phone", 10),
    text("medical_notes", "Medical Notes", 11),
    RESIDENCE_FIELD,
  ];
}

/** The seed rows a slug set is missing. */
export function missingSeeds(
  existing: readonly { slug: string }[],
  gradeLevels: readonly string[],
): FieldDefinitionWrite[] {
  const have = new Set(existing.map((f) => f.slug));
  return seedFieldDefinitions(gradeLevels).filter((f) => !have.has(f.slug!));
}
