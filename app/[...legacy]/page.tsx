import { TenantRedirect } from "@/components/tenant-redirect";

/** `/students`, `/courses/…` without a platform: prefix the user's platform and keep the path. */
export default function LegacyPathPage() {
  return <TenantRedirect />;
}
