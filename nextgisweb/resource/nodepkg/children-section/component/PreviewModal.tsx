import { useState } from "react";

import { Button, Modal } from "@nextgisweb/gui/antd";
import type { ShowModalOptions } from "@nextgisweb/gui/showModal";
import PreviewLayer from "@nextgisweb/layer-preview/preview-layer";
import { gettext } from "@nextgisweb/pyramid/i18n";
import "./PreviewModal.less";

type PreviewModalProps = ShowModalOptions & {
    resourceId: number;
    href: string;
    target?: string;
};

const NavigateButton = (href: string) => {
    return (
        <Button key={href} href={href} target="_blank">
            {gettext("Open in a new tab")}
        </Button>
    );
};

export function PreviewModal({
    resourceId,
    href,
    open: open_,
    ...props
}: PreviewModalProps) {
    const [open, setOpen] = useState(open_);
    return (
        <Modal
            className="map-preview-modal"
            open={open}
            {...props}
            onCancel={() => {
                setOpen(false);
            }}
            closeIcon={false}
            footer={null}
            width={"60vw"}
            height={"60vh"}
        >
            <PreviewLayer
                style={{ height: "60vh", width: "60vw" }}
                resource_id={resourceId}
                previewControls={[NavigateButton(href)]}
            />
        </Modal>
    );
}
