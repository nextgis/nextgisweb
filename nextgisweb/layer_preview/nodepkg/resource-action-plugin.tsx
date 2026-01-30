/** @plugin */
import { Suspense, lazy } from "react";

import showModal from "@nextgisweb/gui/showModal";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registerResourceAction } from "@nextgisweb/resource/resource-section/registry";

import PreviewIcon from "@nextgisweb/icon/material/preview";

const PreviewLayerModal = lazy(
    () => import("./preview-layer/PreviewLayerModal")
);

registerResourceAction(COMP_ID, {
    key: "preview",
    label: gettext("Preview"),
    icon: <PreviewIcon />,
    order: 40,
    attributes: [
        ["resource.has_permission", "data.read"],
        ["layer_preview.available"],
    ],
    condition: ({ it }) =>
        !!it.get("layer_preview.available") &&
        !!it.get("resource.has_permission", "data.read"),
    onClick: ({ id }) => {
        const { destroy } = showModal(
            (props) => (
                <Suspense>
                    <PreviewLayerModal {...props} />
                </Suspense>
            ),
            {
                resourceId: id,
                href: route("layer_preview.map", id).url(),
                open: true,
                onCancel: () => destroy(),
            }
        );
    },
});
