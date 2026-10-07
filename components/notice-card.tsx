"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The outlined button of a notice card. */
export const NOTICE_SECONDARY =
  "border-border bg-background text-foreground hover:bg-accent inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium";
/** The gradient button of a notice card. */
export const NOTICE_PRIMARY =
  "inline-flex items-center rounded-lg bg-gradient-to-r from-[#2563EB] to-[#93C5FD] px-4 py-2 text-sm font-medium text-white";

/** A full-page message outside the shell: logo, title, one line, actions. */
export function NoticeCard({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--sidebar-bg,#fafbfc)] p-8">
      <div className="w-full max-w-md rounded-xl border border-[var(--border-color)] bg-white p-8 text-center shadow-sm">
        <Image
          src="/images/iblai-logo.png"
          alt="ibl.ai"
          width={120}
          height={40}
          className="mx-auto h-8 w-auto"
        />
        {eyebrow ? (
          <p className="text-muted-foreground mt-6 text-xs font-semibold tracking-wider uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className={cn("text-xl font-semibold text-gray-900", eyebrow ? "mt-2" : "mt-6")}>
          {title}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">{body}</p>
        {children ? <div className="mt-6 flex justify-center gap-3">{children}</div> : null}
      </div>
    </div>
  );
}
