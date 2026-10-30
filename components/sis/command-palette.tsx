"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Award,
  BookOpen,
  FileChartColumn,
  GraduationCap,
  Home,
  IdCard,
  Megaphone,
  Plus,
  Settings,
  UserCog,
  Users,
  UsersRound,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { EntityAvatar } from "@/components/sis/entity-avatar";
import { useIsLiveAdmin } from "@/components/sis/admin-mode";
import { useDebounced } from "@/hooks/use-debounced";
import { useSession } from "@/hooks/use-session";
import { useSections } from "@/hooks/use-sections";
import { errorMessage, usePlatformUsersQuery } from "@/lib/sis/api";
import { displayName, roleOf } from "@/lib/sis/format";

const PaletteContext = createContext<{ open: () => void; close: () => void }>({
  open: () => {},
  close: () => {},
});

export function useCommandPalette() {
  return useContext(PaletteContext);
}

/** ⌘K: students and staff from the directory search, courses from the section list, plus navigation and "New …" actions. */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <PaletteContext.Provider value={{ open, close }}>
      {children}
      <CommandPalette open={isOpen} onOpenChange={setIsOpen} />
    </PaletteContext.Provider>
  );
}

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useTranslations("palette");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const router = useRouter();
  const { tenantKey, href, username } = useSession();
  const isLiveAdmin = useIsLiveAdmin();
  const [query, setQuery] = useState("");

  const q = useDebounced(query.trim(), 250);
  const { data, error, isFetching } = usePlatformUsersQuery(
    { platformKey: tenantKey, query: q, page_size: 8 },
    { skip: !open || !q || !isLiveAdmin },
  );
  const sections = useSections({ skip: !open });
  const people = q ? (data?.results ?? []) : [];
  const students = people.filter((p) => roleOf(p) === "student");
  const staff = people.filter((p) => roleOf(p) !== "student");
  const needle = q.toLowerCase();
  const matchedCourses = q
    ? sections.rows
        .map((r) => r.course)
        .filter((c) => c.name.toLowerCase().includes(needle) || c.id.toLowerCase().includes(needle))
        .slice(0, 6)
    : [];

  const go = (path: string) => {
    onOpenChange(false);
    setQuery("");
    router.push(href(path));
  };

  // Commands narrow to what is typed, so Enter opens the typed page.
  const typed = query.trim().toLowerCase();
  const shows = (label: string) => label.toLowerCase().includes(typed);
  const creates = isLiveAdmin
    ? (
        [
          ["inviteStudent", "/students?invite=1"],
          ["inviteStaff", "/staff?invite=1"],
          ["importStudents", "/students?import=1"],
          ["newSection", "/courses?new=1"],
          ["newGroup", "/groups?new=1"],
          ["newEmail", "/messages"],
        ] as const
      ).filter(([key]) => shows(t(key)))
    : [];
  const rows = isLiveAdmin
    ? ([
        ["home", "", Home],
        ["students", "/students", Users],
        ["staff", "/staff", UserCog],
        ["courses", "/courses", BookOpen],
        ["groups", "/groups", UsersRound],
        ["grades", "/grades", GraduationCap],
        ["credentials", "/credentials", Award],
        ["reports", "/reports", FileChartColumn],
        ["messages", "/messages", Megaphone],
        ["setup", "/setup", Settings],
      ] as const)
    : ([
        ["home", "", Home],
        ["courses", "/courses", BookOpen],
        ["details", `/students/${encodeURIComponent(username)}`, IdCard],
      ] as const);
  const goTo = rows.filter(([id]) => shows(tn(id)));

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tc("search")}
      description={t("description")}
      className="top-4 sm:top-1/3"
    >
      <Command shouldFilter={false} className="rounded-xl">
        <CommandInput
          autoFocus
          placeholder={t("placeholder")}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[50dvh] sm:max-h-[60vh]">
          {query.trim() === q && !isFetching ? <CommandEmpty>{t("noResults")}</CommandEmpty> : null}
          {q && error ? (
            <p role="alert" className="text-destructive px-3 py-2 text-xs">
              {errorMessage(error, tc("errorGeneric"))}
            </p>
          ) : null}
          {students.length ? (
            <CommandGroup heading={tn("students")}>
              {students.map((p) => (
                <CommandItem
                  key={p.user_id}
                  value={`student-${p.user_id}`}
                  onSelect={() => go(`/students/${encodeURIComponent(p.username)}`)}
                >
                  <EntityAvatar name={displayName(p)} seed={p.username} size="sm" />
                  <span className="truncate">{displayName(p)}</span>
                  <span className="text-muted-foreground ml-auto truncate text-xs">{p.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {staff.length ? (
            <CommandGroup heading={tn("staff")}>
              {staff.map((p) => (
                <CommandItem
                  key={p.user_id}
                  value={`staff-${p.user_id}`}
                  onSelect={() => go(`/staff/${encodeURIComponent(p.username)}`)}
                >
                  <EntityAvatar name={displayName(p)} seed={p.username} size="sm" />
                  <span className="truncate">{displayName(p)}</span>
                  <span className="text-muted-foreground ml-auto truncate text-xs">{p.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {matchedCourses.length ? (
            <CommandGroup heading={tn("courses")}>
              {matchedCourses.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`course-${c.id}`}
                  onSelect={() => go(`/courses/${encodeURIComponent(c.id)}`)}
                >
                  <EntityAvatar name={c.name} seed={c.id} kind="course" size="sm" />
                  <span className="truncate">{c.name}</span>
                  <span className="text-muted-foreground ml-auto truncate text-xs">{c.run}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          <CommandSeparator />
          {creates.length ? (
            <CommandGroup heading={tc("create")}>
              {creates.map(([key, path]) => (
                <CommandItem key={key} value={key} onSelect={() => go(path)}>
                  <Plus className="size-4" /> {t(key)}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {goTo.length ? (
            <CommandGroup heading={t("goTo")}>
              {goTo.map(([id, path, Icon]) => (
                <CommandItem key={id} value={`go ${id}`} onSelect={() => go(path)}>
                  <Icon className="size-4" /> {tn(id)}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
        <div className="text-muted-foreground hidden flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 px-3 py-2 text-[11px] sm:flex">
          <span>
            <kbd className="rounded border border-gray-200 bg-white px-1 font-sans">↑</kbd>
            <kbd className="ml-0.5 rounded border border-gray-200 bg-white px-1 font-sans">
              ↓
            </kbd>{" "}
            {t("toNavigate")}
          </span>
          <span>
            <kbd className="rounded border border-gray-200 bg-white px-1 font-sans">↵</kbd>{" "}
            {t("toOpen")}
          </span>
          <span>
            <kbd className="rounded border border-gray-200 bg-white px-1 font-sans">esc</kbd>{" "}
            {t("toClose")}
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}
