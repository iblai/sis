"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSession } from "@/hooks/use-session";
import { isUnnamedTenant, shortTenantKey, tenantDisplayName } from "@/lib/iblai/tenant";

export interface Crumb {
  label: ReactNode;
  href?: string;
}

const CrumbContext = createContext<{
  crumbs: Crumb[];
  setCrumbs: (c: Crumb[]) => void;
}>({ crumbs: [], setCrumbs: () => {} });

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  return <CrumbContext.Provider value={{ crumbs, setCrumbs }}>{children}</CrumbContext.Provider>;
}

/** Pages call this to name themselves in the top bar (detail pages add the record). */
export function useBreadcrumbs(crumbs: Crumb[]) {
  const { setCrumbs } = useContext(CrumbContext);
  const key = JSON.stringify(
    crumbs.map((c) => [typeof c.label === "string" ? c.label : "", c.href]),
  );
  useEffect(() => {
    setCrumbs(crumbs);
    return () => setCrumbs([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

const SECTION_KEYS = {
  students: "nav.students",
  staff: "nav.staff",
  courses: "nav.courses",
  groups: "nav.groups",
  attendance: "nav.attendance",
  grades: "nav.grades",
  credentials: "nav.credentials",
  reports: "nav.reports",
  messages: "nav.messages",
  setup: "nav.setup",
  notifications: "breadcrumbs.notifications",
  admin: "breadcrumbs.admin",
  users: "breadcrumbs.users",
} as const;

const isSection = (seg: string): seg is keyof typeof SECTION_KEYS =>
  Object.hasOwn(SECTION_KEYS, seg);

export function Breadcrumbs() {
  const t = useTranslations();
  const { crumbs } = useContext(CrumbContext);
  const pathname = usePathname() ?? "/";
  const { currentTenant, tenantKey, href } = useSession();

  // Fallback: derive from the URL when a page has not set crumbs.
  const derived: Crumb[] =
    crumbs.length > 0
      ? crumbs
      : pathname
          .replace(href(), "")
          .split("/")
          .filter(Boolean)
          .filter(isSection)
          .map((seg, i, arr) => ({
            label: t(SECTION_KEYS[seg]),
            href: href(`/${arr.slice(0, i + 1).join("/")}`),
          }));

  const items: Crumb[] = [
    {
      label: isUnnamedTenant(currentTenant)
        ? t("shell.platform")
        : tenantDisplayName(currentTenant) || shortTenantKey(tenantKey),
      href: href(),
    },
    ...derived,
  ];

  return (
    <nav aria-label={t("breadcrumbs.label")} className="flex min-w-0 items-center text-sm">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex min-w-0 items-center">
            {i > 0 ? <ChevronRight className="mx-1 size-3.5 shrink-0 text-gray-300" /> : null}
            {item.href && !last ? (
              <Link
                href={item.href}
                className="max-w-[10rem] truncate text-[#646464] hover:text-gray-900 sm:max-w-[16rem]"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  last
                    ? "max-w-[12rem] truncate font-medium text-gray-900 sm:max-w-[20rem]"
                    : "max-w-[10rem] truncate text-[#646464]"
                }
                aria-current={last ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
