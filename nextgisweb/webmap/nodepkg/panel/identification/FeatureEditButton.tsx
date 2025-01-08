import { useMemo } from "react";

import { FeatureEditorModal } from "@nextgisweb/feature-layer/feature-editor-modal";
import { Button } from "@nextgisweb/gui/antd";
import showModal from "@nextgisweb/gui/showModal";
import { gettext } from "@nextgisweb/pyramid/i18n";
import topic from "@nextgisweb/webmap/compat/topic";
import type { Display } from "@nextgisweb/webmap/display";
import type { TreeItemConfig } from "@nextgisweb/webmap/type/TreeItems";

import type { FeatureEditButtonProps } from "./identification";

import EditIcon from "@nextgisweb/icon/material/edit/fill";

const isLayerReadOnly = (display: Display, config: TreeItemConfig): boolean => {
    const pluginName = "@nextgisweb/webmap/plugin/feature-layer";

    if (display.isTinyMode() && !display.isTinyModePlugin(pluginName)) {
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
    const configs = Object.values(display.getItemConfig());
    return configs.some((c) => {
        return (
            c.type === "layer" &&
            c.layerId === layerId &&
            isLayerReadOnly(display, c)
        );
    });
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

    if (!editEnabled) {
        return null;
    }

    const edit = () => {
        showModal(FeatureEditorModal, {
            editorOptions: {
                featureId,
                resourceId,
                onSave: () => {
                    onUpdate();
                    topic.publish("feature.updated", {
                        resourceId,
                        featureId,
                    });
                },
            },
        });
    };

    return (
        <Button
            type="text"
            size="small"
            icon={<EditIcon />}
            title={gettext("Edit feature")}
            onClick={edit}
        />
    );
};
