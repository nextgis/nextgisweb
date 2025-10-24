import { useCallback, useReducer } from "react";

import { PreviewMapModal } from "@nextgisweb/gui/component/preview-map-modal/PreviewMapModal";
import type { PreviewMapModalProps } from "@nextgisweb/gui/component/preview-map-modal/PreviewMapModal";
import { CloseIcon, OpenInNewIcon } from "@nextgisweb/gui/icon";
import { PreviewLayer } from "@nextgisweb/layer-preview/preview-layer/PreviewLayer";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ButtonControl } from "@nextgisweb/webmap/map-component";

type PreviewLayerModalProps = PreviewMapModalProps & {
    resourceId: number;
    href?: string;
    target?: string;
};

function PreviewLayerModal({
    resourceId,
    href,
    open: openProp,
    children,
    ...props
}: PreviewLayerModalProps) {
    const [open, close] = useReducer(() => false, openProp ?? true);
    const onOpenNewClick = useCallback(() => {
        window.open(href, "_blank");
    }, [href]);

    return (
        <PreviewMapModal open={open} {...props}>
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
                {href && (
                    <ButtonControl
                        position="top-right"
                        onClick={onOpenNewClick}
                        title={gettext("Open in a new tab")}
                    >
                        <OpenInNewIcon />
                    </ButtonControl>
                )}
                {children}
            </PreviewLayer>
        </PreviewMapModal>
    );
}

export default PreviewLayerModal;
