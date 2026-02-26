import { useState } from "react";
import type React from "react";

import { Button, Flex, Modal, Space } from "@nextgisweb/gui/antd";
import { CloseIcon, OpenInNewIcon } from "@nextgisweb/gui/icon";
import type { ParamsOf } from "@nextgisweb/gui/type";

export type PreviewMapModalProps = ParamsOf<typeof Modal> & {
    children?: React.ReactNode;
    href?: string;
};

export function FastResourceActionModal({
    href,
    children,
    onCancel,
    title,
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
                    marginRight: "-26px",
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
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : null}

                <Button
                    type="text"
                    size="middle"
                    icon={<CloseIcon style={{ fontSize: 18 }} />}
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpen(false);
                    }}
                />
            </Space>
        </Flex>
    );

    return (
        <Modal
            width="60vw"
            open={open}
            onCancel={onCancel}
            footer={false}
            closable={false}
            title={header}
            styles={{
                title: {
                    paddingBottom: "10px",
                    paddingRight: 8,
                },
            }}
            {...props}
        >
            {children}
        </Modal>
    );
}
