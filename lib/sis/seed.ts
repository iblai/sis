import type { FieldDefinitionWrite } from "./types";

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
      name: "Grade level",
      field_type: "select",
      required: true,
      choices: [...gradeLevels],
      display_order: 2,
      active: true,
    },
    {
      slug: "enrollment_status",
      name: "Enrollment status",
      field_type: "select",
      required: true,
      choices: ["active", "withdrawn", "graduated", "transferred"],
      display_order: 3,
      active: true,
    },
    text("homeroom", "Homeroom", 4),
    text("guardian_name", "Guardian name", 5),
    text("guardian_relationship", "Guardian relationship", 6),
    text("guardian_phone", "Guardian phone", 7),
    text("guardian_email", "Guardian email", 8),
    text("emergency_contact_name", "Emergency contact name", 9),
    text("emergency_contact_phone", "Emergency contact phone", 10),
    text("medical_notes", "Medical notes", 11),
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
