import { useMemo } from "react";

import { useShowModal } from "@nextgisweb/gui";
import { Button } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import topic from "@nextgisweb/webmap/compat/topic";
import type { Display } from "@nextgisweb/webmap/display";
import type { TreeItemConfig } from "@nextgisweb/webmap/type/TreeItems";

import type { FeatureEditButtonProps } from "./identification";

import EditIcon from "@nextgisweb/icon/material/edit/fill";

const isLayerReadOnly = (display: Display, config: TreeItemConfig): boolean => {
    const pluginName = "@nextgisweb/webmap/plugin/feature-layer";

    if (display.isTinyMode && !display.isTinyModePlugin(pluginName)) {
        return false;
    }
    if (config.type === "layer") {
        const configLayerPlugin = config.plugin[pluginName];
        const readOnly = configLayerPlugin?.readonly;
        return !readOnly;
    }
    return false;
};

const editLayerEnabled = (display: Display, layerId: number): boolean => {
    return display.treeStore
        .filter({
            type: "layer",
            layerId,
        })
        .some((c) => isLayerReadOnly(display, c));
};

export const FeatureEditButton = ({
    display,
    resourceId,
    featureId,
    onUpdate,
}: FeatureEditButtonProps) => {
    const editEnabled = useMemo<boolean>(
        () => editLayerEnabled(display, resourceId),
        [display, resourceId]
    );
    const { lazyModal, modalHolder, isLoading } = useShowModal();

    if (!editEnabled) {
        return null;
    }

    const edit = () => {
        lazyModal(
            () => import("@nextgisweb/feature-layer/feature-editor-modal"),
            {
                editorOptions: {
                    featureId,
                    resourceId,
                    showGeometryTab: false,
                    onSave: () => {
                        onUpdate();
                        topic.publish("feature.updated", {
                            resourceId,
                            featureId,
                        });
                    },
                },
            }
        );
    };

    return (
        <>
            {modalHolder}
            <Button
                type="text"
                size="small"
                loading={isLoading}
                icon={<EditIcon />}
                title={gettext("Edit feature")}
                onClick={edit}
            />
        </>
    );
};
