"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useStore } from "@/lib/store";

/** Global confirm dialog driven by the store. */
export function ConfirmDialog() {
  const confirm = useStore((s) => s.confirm);
  const dismiss = useStore((s) => s.dismissConfirm);

  if (!confirm) return null;

  return (
    <AlertDialog open onOpenChange={(o) => !o && dismiss()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
          {confirm.body && (
            <AlertDialogDescription className="leading-relaxed">
              {confirm.body}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogCancel
            onClick={dismiss}
            className="mt-0"
          >
            {confirm.cancelLabel ?? "إلغاء"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              confirm.onConfirm();
              dismiss();
            }}
            className={
              confirm.destructive
                ? "bg-coral text-white hover:bg-coral/90"
                : "bg-trust text-white hover:bg-trust/90"
            }
          >
            {confirm.confirmLabel ?? "تأكيد"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
