import { publish } from "dojo/topic";
import { useMemo } from "react";

import { FeatureEditorModal } from "@nextgisweb/feature-layer/feature-editor-modal";
import { Button } from "@nextgisweb/gui/antd";
import showModal from "@nextgisweb/gui/showModal";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { DojoDisplay } from "@nextgisweb/webmap/type";

import type { FeatureEditButtonProps } from "./identification";

import EditIcon from "@nextgisweb/icon/material/edit/fill";

const isLayerReadOnly = (
    display: DojoDisplay,
    config: Record<string, any>
): boolean => {
    const pluginName = "ngw-webmap/plugin/FeatureLayer";

    if (display.isTinyMode() && !display.isTinyModePlugin(pluginName)) {
        return false;
    }

    const configLayerPlugin = config.plugin[pluginName];
    const readOnly = configLayerPlugin.readonly;
    return !readOnly;
};

const editLayerEnabled = (display: DojoDisplay, layerId: number): boolean => {
    const configs = Object.values(display.getItemConfig());
    return configs.some((c: Record<string, any>) => {
        return c.layerId === layerId && isLayerReadOnly(display, c);
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
                    publish("feature.updated", {
                        resourceId,
                        featureId,
                    });
                },
            },
        });
    };

    return (
        <Button
            title={gettext("Edit feature")}
            onClick={edit}
            type="text"
            icon={<EditIcon />}
        />
    );
};
