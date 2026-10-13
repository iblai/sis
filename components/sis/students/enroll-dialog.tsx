"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { SectionPicker } from "@/components/sis/section-picker";
import { useSections } from "@/hooks/use-sections";
import { useSession } from "@/hooks/use-session";
import { useToastError } from "@/hooks/use-toast-error";
import { useCreateCourseInvitationMutation } from "@/lib/sis/api";

/** Enroll an existing user in a section: a course invitation by username, which the DM enrolls on edX. */
export function EnrollDialog({
  open,
  onOpenChange,
  username,
  exclude = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  /** Course ids the user is already enrolled in. */
  exclude?: string[];
}) {
  const t = useTranslations("enrollment.enrollDialog");
  const tc = useTranslations("common");
  const { tenantKey } = useSession();
  const toastError = useToastError();
  const sections = useSections({ skip: !open });
  const [courseId, setCourseId] = useState("");
  const [create, { isLoading }] = useCreateCourseInvitationMutation();
  const rows = sections.rows.filter((r) => !exclude.includes(r.course.id));

  const submit = async () => {
    if (!courseId) return;
    try {
      await create({ platformKey: tenantKey, body: { course_id: courseId, username } }).unwrap();
      toast.success(t("done"));
      setCourseId("");
      onOpenChange(false);
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="enroll-section">{t("section")}</Label>
          <SectionPicker
            id="enroll-section"
            value={courseId}
            onChange={setCourseId}
            rows={rows}
            placeholder={t("pickSection")}
            disabled={sections.isLoading}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button
            className="ibl-button-primary"
            disabled={!courseId || isLoading}
            onClick={() => void submit()}
          >
            {isLoading ? <Spinner size="sm" className="size-4 text-current" /> : null}
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
