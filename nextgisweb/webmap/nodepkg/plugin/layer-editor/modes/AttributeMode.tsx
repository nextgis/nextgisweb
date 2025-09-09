import { click, pointerMove } from "ol/events/condition";
import { Select } from "ol/interaction";
import type { SelectEvent } from "ol/interaction/Select";
import { useCallback, useState } from "react";

import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import { useShowModal } from "@nextgisweb/gui";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ToggleControl } from "@nextgisweb/webmap/map-component";

import { EDITING_STATES } from "../constant";
import { useEditorContext } from "../context/useEditorContext";
import { useInteraction } from "../hook/useInteraction";

import AttributeIcon from "@nextgisweb/icon/material/docs";

export function AttributeMode({
    order,
    resourceId,
}: {
    order?: number;
    resourceId: number;
}) {
    const { layer, addUndo, selectStyle } = useEditorContext();
    const { modalHolder, lazyModal } = useShowModal();
    const { makeSignal } = useAbortController();
    const [active, setActive] = useState(false);

    const createHoverSelect = useCallback(() => {
        return new Select({
            layers: [layer],
            style: selectStyle,
            condition: pointerMove,
            multi: false,
        });
    }, [layer, selectStyle]);

    const hover = useInteraction(
        `${EDITING_STATES.ATTRIBUTE_EDITING}-hoverselect`,
        active,
        createHoverSelect
    );

    const onUpdate = useCallback(
        async (ev: SelectEvent) => {
            const feature = ev.selected[0];

            if (feature) {
                let prevItem: FeatureItem = feature.get("attribution");
                const featureId: number = feature.get("id");
                if (!prevItem && typeof featureId === "number") {
                    prevItem = await route("feature_layer.feature.item", {
                        id: resourceId,
                        fid: featureId,
                    }).get<FeatureItem>({
                        signal: makeSignal(),
                        query: { dt_format: "iso" },
                    });
                    feature.set("attribution", prevItem);
                }
                let hasChanges = false;
                await new Promise((resolve) => {
                    lazyModal(
                        () =>
                            import(
                                "@nextgisweb/feature-layer/feature-editor-modal"
                            ),
                        {
                            editorOptions: {
                                mode: "return",
                                showGeometryTab: false,
                                resourceId,
                                featureItem: prevItem,
                                onOk: (item) => {
                                    if (Object.values(item).filter(Boolean)) {
                                        feature.set("attribution", {
                                            ...prevItem,
                                            ...item,
                                        });
                                        hasChanges = true;
                                    }
                                    resolve(undefined);
                                },
                            },
                            onCancel: resolve,
                        }
                    );
                });
                if (hasChanges) {
                    return () => {
                        feature.set("attribution", prevItem);
                    };
                }
            }
        },
        [lazyModal, makeSignal, resourceId]
    );

    const createSelect = useCallback(() => {
        const select = new Select({
            layers: [layer],
            style: selectStyle,
            condition: click,
            multi: false,
        });
        select.on("select", async (ev) => {
            const undo = await onUpdate?.(ev);
            if (undo) {
                addUndo(undo);
            }
            select.getFeatures().clear();
            hover.getFeatures().clear();
        });
        return select;
    }, [addUndo, hover, layer, onUpdate, selectStyle]);

    useInteraction(
        `${EDITING_STATES.ATTRIBUTE_EDITING}-select`,
        active,
        createSelect
    );

    return (
        <>
            {modalHolder}
            <ToggleControl
                groupId={EDITING_STATES.ATTRIBUTE_EDITING}
                title={gettext("Attribute editing")}
                order={order}
                onChange={setActive}
            >
                <AttributeIcon />
            </ToggleControl>
        </>
    );
}
