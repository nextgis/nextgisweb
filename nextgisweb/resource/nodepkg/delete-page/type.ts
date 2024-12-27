import type { ShowModalOptions } from "@nextgisweb/gui/showModal";

interface IsModal {
    navigateToId?: never;
    isModal: true;
    onCancel: () => void;
    onOk: () => void;
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
    onOkDelete: () => void;
    onCancelDelete: () => void;
}
