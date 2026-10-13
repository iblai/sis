import type { RoleMember } from "./types";

/** The LMS keys a role's member list by the role it was asked for (`{ course_id, staff: [...] }`), never `users`. */
export const roleMembers = (raw: Record<string, unknown>, rolename: string): RoleMember[] => {
  const list = raw[rolename] ?? raw.users;
  return Array.isArray(list) ? (list as RoleMember[]) : [];
};
