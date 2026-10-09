"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EntityAvatar } from "@/components/sis/entity-avatar";
import { useDebounced } from "@/hooks/use-debounced";
import { useSession } from "@/hooks/use-session";
import { errorMessage, usePlatformUsersQuery } from "@/lib/sis/api";
import { displayName, roleOf } from "@/lib/sis/format";
import type { MemberRole, PlatformUser } from "@/lib/sis/types";
import { cn } from "@/lib/utils";

/** A combobox over the platform's directory — the server matches username and email, never "the first 100 rows". */
export function UserPicker({
  value,
  onChange,
  roles,
  placeholder,
  disabled,
  size = "default",
  className,
}: {
  value: PlatformUser | null;
  onChange: (user: PlatformUser | null) => void;
  /** Keep only these roles (the directory also carries staff). */
  roles?: MemberRole[];
  placeholder?: string;
  disabled?: boolean;
  size?: "sm" | "default";
  className?: string;
}) {
  const t = useTranslations("picker");
  const tc = useTranslations("common");
  const { tenantKey } = useSession();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim(), 250);
  const {
    currentData: data,
    isFetching,
    error,
  } = usePlatformUsersQuery(
    { platformKey: tenantKey, query: q, page_size: 10 },
    { skip: q.length === 0 },
  );
  const results = (data?.results ?? []).filter((u) => !roles || roles.includes(roleOf(u)));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size={size}
            disabled={disabled}
            aria-expanded={open}
            className={cn("w-full justify-between font-normal", className)}
          />
        }
      >
        <span
          className={cn("min-w-0 flex-1 truncate text-left", !value && "text-muted-foreground")}
        >
          {value ? displayName(value) : (placeholder ?? t("user"))}
        </span>
        <ChevronsUpDown className="text-muted-foreground size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) min-w-72 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder={t("searchPlaceholder")}
          />
          <CommandList>
            {results.length === 0 ? (
              // Outside CommandEmpty: cmdk hides that while the clear row is mounted.
              <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                {q.length === 0
                  ? t("typeToSearch")
                  : isFetching
                    ? t("searching")
                    : error
                      ? errorMessage(error, tc("errorGeneric"))
                      : t("noMatches")}
              </p>
            ) : null}
            {value ? (
              <CommandGroup>
                <CommandItem
                  value="__clear"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="text-muted-foreground gap-2"
                >
                  <X className="size-4" /> {t("clear")}
                </CommandItem>
              </CommandGroup>
            ) : null}
            {results.length > 0 ? (
              <CommandGroup>
                {results.map((row) => (
                  <CommandItem
                    key={row.user_id}
                    value={row.username}
                    onSelect={() => {
                      onChange(row);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="gap-2"
                  >
                    <EntityAvatar name={displayName(row)} seed={row.username} size="xs" />
                    <span className="min-w-0 flex-1 truncate">{displayName(row)}</span>
                    <span className="text-muted-foreground truncate text-xs">{row.email}</span>
                    {row.username === value?.username ? (
                      <Check className="size-4 text-[#0058cc]" />
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
