"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { errorMessage, errorStatus } from "@/lib/sis/errors";

/** Toast a backend failure in its own words; a 403 says so plainly. */
export function useToastError() {
  const tc = useTranslations("common");
  return (err: unknown) => {
    toast.error(
      errorStatus(err) === 403 ? tc("errorForbidden") : errorMessage(err, tc("errorGeneric")),
    );
  };
}
