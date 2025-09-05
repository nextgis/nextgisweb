import { useCallback, useReducer } from "react";

import { Modal } from "@nextgisweb/gui/antd";
import { CloseIcon, OpenInNewIcon } from "@nextgisweb/gui/icon";
import type { ShowModalOptions } from "@nextgisweb/gui/showModal";
import { PreviewLayer } from "@nextgisweb/layer-preview/preview-layer/PreviewLayer";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ButtonControl } from "@nextgisweb/webmap/map-component";
import "./PreviewModal.less";

type PreviewModalProps = ShowModalOptions & {
    resourceId: number;
    href?: string;
    target?: string;
};

function PreviewModal({
    resourceId,
    href,
    open: open_,
    ...props
}: PreviewModalProps) {
    const [open, close] = useReducer(() => false, open_ ?? true);

    const onOpenNewClick = useCallback(() => {
        window.open(href, "_blank");
    }, [href]);

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
                >
                    <CloseIcon />
                </ButtonControl>

                <ButtonControl
                    position="top-right"
                    onClick={onOpenNewClick}
                    title={gettext("Open in a new tab")}
                >
                    <OpenInNewIcon />
                </ButtonControl>
            </PreviewLayer>
        </Modal>
    );
}

export default PreviewModal;
