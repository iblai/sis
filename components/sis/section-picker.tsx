"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { filterSections, sectionLabel, type SectionRow } from "@/lib/sis/sections";
import { cn } from "@/lib/utils";

/** A combobox over the section list: type to search by name, course id or number, as the Courses page does. */
export function SectionPicker({
  id,
  value,
  onChange,
  rows,
  placeholder,
  disabled,
  size = "default",
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string | null | undefined;
  onChange: (courseId: string) => void;
  rows: SectionRow[];
  placeholder?: string;
  disabled?: boolean;
  size?: "sm" | "default";
  className?: string;
  "aria-label"?: string;
}) {
  const t = useTranslations("courses");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = rows.find((r) => r.course.id === value);
  const results = filterSections(rows, { query });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            size={size}
            disabled={disabled}
            aria-expanded={open}
            aria-label={ariaLabel}
            className={cn("w-full justify-between font-normal", className)}
          />
        }
      >
        <span
          className={cn("min-w-0 flex-1 truncate text-left", !value && "text-muted-foreground")}
        >
          {selected ? sectionLabel(selected) : value || placeholder}
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
              // Outside CommandEmpty: cmdk shows that only while no row is mounted.
              <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                {t("empty.noMatch")}
              </p>
            ) : (
              <CommandGroup>
                {results.map((r) => (
                  <CommandItem
                    key={r.course.id}
                    value={r.course.id}
                    onSelect={() => {
                      onChange(r.course.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="gap-2"
                  >
                    <span className="min-w-0 flex-1 truncate">{sectionLabel(r)}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {r.course.number}
                    </span>
                    {r.course.id === value ? <Check className="size-4 text-[#0058cc]" /> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
