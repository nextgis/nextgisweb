import { Modal } from "@nextgisweb/gui/antd";
import type { ModalProps } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { CopyForm } from "./CopyForm";

export interface CopyModalProps extends Omit<ModalProps, "onCancel"> {
  versionId: number | [number, number];
  resourceId: number;
  onCancel?: () => void;
}

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
