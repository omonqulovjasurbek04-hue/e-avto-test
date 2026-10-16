import { useTranslation } from "react-i18next";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open?: boolean;
  isOpen?: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const isDialogActive = isOpen ?? open ?? false;

  return (
    <Modal isOpen={isDialogActive} onClose={onCancel} title={title ?? t("common.areYouSure")} maxWidth="sm">
      {message && <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          {cancelText ?? t("common.cancel")}
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmText ?? t("common.yes")}
        </Button>
      </div>
    </Modal>
  );
}
