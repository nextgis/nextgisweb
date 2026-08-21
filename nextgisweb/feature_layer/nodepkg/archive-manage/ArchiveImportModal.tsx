import type { ReactNode } from "react";

import { Modal } from "@nextgisweb/gui/antd";
import type { ModalProps } from "@nextgisweb/gui/antd";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

interface ArchiveImportModalProps extends ModalProps {
  resourceId: number;
  children?: ReactNode;
}

const msgSuccess = gettext("The archive has been successfully imported.");
const msgReturn = gettext("Back to resource");
const msgClose = gettext("Close");

export function ArchiveImportModal({
  resourceId,
  children,
  ...modalProps
}: ArchiveImportModalProps) {
  const backToResource = () => {
    window.open(routeURL("resource.show", { id: resourceId }), "_self");
  };

  return (
    <Modal
      okText={msgReturn}
      onOk={backToResource}
      cancelText={msgClose}
      {...modalProps}
    >
      {msgSuccess}
      {children}
    </Modal>
  );
}
