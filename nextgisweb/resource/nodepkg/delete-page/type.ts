import type { ShowModalOptions } from "@nextgisweb/gui/showModal";

interface IsModal {
  navigateToId?: never;
  isModal: true;
  onCancel: () => void;
  onOk: (deletedIds: number[]) => void;
}

interface NotModal {
  navigateToId: number;
  isModal: false;
  onCancel?: never;
  onOk?: never;
}

export type DeletePageProps = {
  resources: number[];
} & (IsModal | NotModal);

export interface DeleteConfirmModalProps extends ShowModalOptions {
  resources: number[];
  onOkDelete: (deletedIds: number[]) => void;
  onCancelDelete: () => void;
}
