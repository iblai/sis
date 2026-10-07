import { TenantRedirect } from "@/components/tenant-redirect";

/** `/` names no platform: send the user to `/platform/<their platform>`. */
export default function RootPage() {
  return <TenantRedirect />;
}
