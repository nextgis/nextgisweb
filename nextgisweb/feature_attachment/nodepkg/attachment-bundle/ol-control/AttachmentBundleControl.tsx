import { useCallback } from "react";

import settings from "@nextgisweb/feature-attachment/client-settings";
import { useDisplayContext } from "@nextgisweb/webmap/display/context/useDisplayContext";
import { ButtonControl } from "@nextgisweb/webmap/map-component";
import type { ButtonControlProps } from "@nextgisweb/webmap/map-component";

import AttachFileIcon from "@nextgisweb/icon/material/attach_file";

export default function AttachmentBundleControl(props: ButtonControlProps) {
    const { display } = useDisplayContext();

    const onClick = useCallback(() => {
        if (!display) return;

        const label = props.title;

        display.tabsManager.addTab({
            key: "attachments",
            label,
            component: () =>
                import("@nextgisweb/feature-attachment/attachment-bundle/tab"),
            props: {
                display,
            },
        });
    }, [display, props.title]);

    if (!settings["webmap"]["bundle"]) {
        return null;
    }

    return (
        <ButtonControl {...props} onClick={onClick}>
            <AttachFileIcon />
        </ButtonControl>
    );
}
