"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-session";
import { useToastError } from "@/hooks/use-toast-error";
import { useCreateUserGroupMutation, useUpdateUserGroupMutation } from "@/lib/sis/api";
import type { UserGroup } from "@/lib/sis/types";

/** Create a group, or rename one when `group` is given. */
export function GroupDialog({
  open,
  onOpenChange,
  group,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: UserGroup;
}) {
  const t = useTranslations("groups.dialog");
  const tc = useTranslations("common");
  const router = useRouter();
  const { tenantKey, href } = useSession();
  const toastError = useToastError();
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [create, createState] = useCreateUserGroupMutation();
  const [update, updateState] = useUpdateUserGroupMutation();
  const busy = createState.isLoading || updateState.isLoading;

  const submit = async () => {
    if (!name.trim()) return;
    try {
      if (group) {
        await update({
          id: group.id,
          body: { name: name.trim(), description: description.trim() },
        }).unwrap();
        toast.success(t("updated"));
        onOpenChange(false);
      } else {
        const created = await create({
          platform_key: tenantKey,
          name: name.trim(),
          description: description.trim(),
        }).unwrap();
        toast.success(t("created", { name: created.name }));
        // Close first: the list answers a close with router.replace, which would cancel a push already pending.
        onOpenChange(false);
        router.push(href(`/groups/${created.id}`));
      }
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{group ? t("editTitle") : t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="group-name">{tc("name")}</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="group-description">{tc("description")}</Label>
            <Input
              id="group-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" className="ibl-button-primary" disabled={!name.trim() || busy}>
              {busy ? <Spinner size="sm" className="size-4 text-current" /> : null}
              {group ? tc("save") : tc("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
