import { Modal } from "@nextgisweb/gui/antd";
import type { ParamsOf } from "@nextgisweb/gui/type";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { CopyForm } from "./CopyForm";

export type CopyModalProps = Omit<ParamsOf<typeof Modal>, "onCancel"> & {
    versionId: number | [number, number];
    resourceId: number;
    onCancel?: () => void;
};

export default function CopyModal({
    versionId,
    resourceId,
    onCancel,
    ...props
}: CopyModalProps) {
    return (
        <Modal
            title={gettext("Create copy")}
            onCancel={onCancel}
            footer={null}
            destroyOnHidden
            width={740}
            {...props}
        >
            <CopyForm
                style={{ paddingTop: "15px" }}
                versionId={versionId}
                resourceId={resourceId}
                onCreate={onCancel}
            />
        </Modal>
    );
}
