import { useReducer } from "react";

import { Modal } from "@nextgisweb/gui/antd";
import type { ShowModalOptions } from "@nextgisweb/gui/showModal";
import PreviewLayer from "@nextgisweb/layer-preview/preview-layer";
import { gettext } from "@nextgisweb/pyramid/i18n";
import "./PreviewModal.less";
import { html } from "@nextgisweb/pyramid/icon";
import { ButtonControl } from "@nextgisweb/webmap/map-component";

type PreviewModalProps = ShowModalOptions & {
    resourceId: number;
    href: string;
    target?: string;
};

export function PreviewModal({
    resourceId,
    href,
    open: open_,
    ...props
}: PreviewModalProps) {
    const [open, close] = useReducer(() => false, open_ ?? true);
    return (
        <Modal
            className="map-preview-modal"
            open={open}
            {...props}
            onCancel={close}
            closeIcon={false}
            footer={null}
            width={"60vw"}
            height={"60vh"}
        >
            <PreviewLayer
                style={{ height: "60vh", width: "60vw" }}
                resourceId={resourceId}
            >
                <ButtonControl
                    position="top-right"
                    onClick={close}
                    title={gettext("Close")}
                    html={html({ glyph: "close" })}
                />
                <ButtonControl
                    position="top-right"
                    onClick={() => window.open(href, "_blank")}
                    title={gettext("Open in a new tab")}
                    html={html({ glyph: "open_in_new" })}
                />
            </PreviewLayer>
        </Modal>
    );
}
