import { useState } from "react";

import { Modal } from "@nextgisweb/gui/antd";
import type { ShowModalOptions } from "@nextgisweb/gui/showModal";
import { gettext } from "@nextgisweb/pyramid/i18n";

import CatalogBrowse from "../catalog-browse";
import CatalogImport from "../catalog-import";

const msgTitle = gettext("Add spatial reference system");

export interface SrsCatalogModalProps extends ShowModalOptions {
  code: string;
  onImported: (srs: { id: number }) => void;
}

export function SrsCatalogModal({
  code,
  onImported,
  close,
  width = 800,
  ...rest
}: SrsCatalogModalProps) {
  const [catalogId, setCatalogId] = useState<number | null>(null);

  return (
    <Modal title={msgTitle} width={width} footer={null} {...rest}>
      {catalogId === null ? (
        <CatalogBrowse
          lockedCode={code}
          onImportClick={setCatalogId}
          scroll={{ y: "60vh" }}
        />
      ) : (
        <CatalogImport
          key={catalogId}
          id={catalogId}
          onImported={(srs) => {
            onImported(srs);
            close?.();
          }}
        />
      )}
    </Modal>
  );
}
