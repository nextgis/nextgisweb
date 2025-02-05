import { useCallback } from "react";

import { Modal } from "@nextgisweb/gui/antd";
import { CloseIcon, OpenInNewIcon } from "@nextgisweb/gui/icon";
import type { ShowModalOptions } from "@nextgisweb/gui/showModal";
import PreviewLayer from "@nextgisweb/layer-preview/preview-layer";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ButtonControl } from "@nextgisweb/webmap/map-component";
import "./PreviewModal.less";
import type { OnClick } from "@nextgisweb/webmap/ol/control/createButtonControl";

type PreviewModalProps = ShowModalOptions & {
    resourceId: number;
    href: string;
    target?: string;
};

export function PreviewModal({
    resourceId,
    href,
    onCancel,
    ...props
}: PreviewModalProps) {
    const onOpenNewClick = useCallback(
        () => window.open(href, "_blank"),
        [href]
    );

    return (
        <Modal
            className="map-preview-modal"
            {...props}
            onCancel={onCancel}
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
                    onClick={onCancel as OnClick}
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
