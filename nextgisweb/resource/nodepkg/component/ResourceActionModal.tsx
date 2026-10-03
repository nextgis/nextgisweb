import { useState } from "react";
import type { MouseEvent, ReactNode } from "react";

import { Button, Flex, Modal, Space } from "@nextgisweb/gui/antd";
import type { ModalProps } from "@nextgisweb/gui/antd";
import { FullHeightModal } from "@nextgisweb/gui/full-height-modal/FullHeightModal";
import { CloseIcon, OpenInNewIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

const msgOpenInNewTab = gettext("Open in new tab");
const msgClose = gettext("Close");

export interface PreviewMapModalProps extends ModalProps {
  children?: ReactNode;
  fullHeight?: boolean;
  href?: string;
}

export function ResourceActionModal({
  href,
  title,
  children,
  fullHeight,
  onCancel,
  ...props
}: PreviewMapModalProps) {
  const [open, setOpen] = useState(true);

  const header = (
    <Flex
      align="center"
      justify="space-between"
      style={{
        width: "100%",
      }}
    >
      <div>{title}</div>
      <Space
        size={8}
        style={{
          marginInlineEnd: "-16px",
          marginTop: "-16px",
        }}
      >
        {href ? (
          <Button
            type="text"
            size="middle"
            icon={<OpenInNewIcon style={{ fontSize: 18 }} />}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={msgOpenInNewTab}
            onClick={(e) => e.stopPropagation()}
          />
        ) : null}

        <Button
          type="text"
          size="middle"
          icon={<CloseIcon style={{ fontSize: 18 }} />}
          title={msgClose}
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            setOpen(false);
            onCancel?.(e);
          }}
        />
      </Space>
    </Flex>
  );

  const ModalComponent = fullHeight ? FullHeightModal : Modal;

  return (
    <ModalComponent
      open={open}
      width="60vw"
      title={header}
      footer={false}
      closable={false}
      onCancel={onCancel}
      centered
      destroyOnHidden
      {...props}
    >
      {children}
    </ModalComponent>
  );
}
