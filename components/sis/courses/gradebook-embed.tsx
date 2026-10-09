"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import config from "@/lib/iblai/config";
import { LOCAL_STORAGE_KEYS } from "@/lib/iblai/auth-utils";

/**
 * The Open edX gradebook micro-frontend in an iframe. The MFE posts
 * `auth.jwt.ready`; the host answers `auth.jwt.token` with the edX JWT, to
 * the MFE's origin only (the Agentic LMS's handshake).
 */
export function GradebookEmbed({
  courseId,
  open,
  onOpenChange,
}: {
  courseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("gradebook.embed");
  const ref = useRef<HTMLIFrameElement>(null);
  const src = `${config.mfeUrl()}/gradebook/${courseId}`;
  const origin = new URL(src).origin;

  useEffect(() => {
    if (!open) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      if (!event.data || typeof event.data !== "object" || event.data.type !== "auth.jwt.ready")
        return;
      const token = localStorage.getItem(LOCAL_STORAGE_KEYS.EDX_TOKEN_KEY);
      if (!token) return;
      ref.current?.contentWindow?.postMessage(
        { type: "auth.jwt.token", edx_jwt_token: token },
        origin,
      );
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open, origin]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-dvh max-h-dvh w-screen max-w-none grid-rows-[auto_minmax(0,1fr)] rounded-none p-0 sm:h-[90dvh] sm:w-[min(96vw,1400px)] sm:max-w-none sm:rounded-xl">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open ? (
          <iframe ref={ref} src={src} title={t("title")} className="h-full w-full border-0" />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
