import Feature from "ol/Feature";
import { unByKey } from "ol/Observable";
import Polygon, { fromExtent as polygonFromExtent } from "ol/geom/Polygon";
import { transformExtent } from "ol/proj";
import VectorSource from "ol/source/Vector";
import { useEffect, useMemo, useState } from "react";

import {
    DEFAULT_PADDING,
    DEFAULT_SRS,
} from "@nextgisweb/feature-layer/geometry-editor/constant";
import { CloseIcon, DeleteIcon } from "@nextgisweb/gui/icon";
import { convertWSENToNgwExtent } from "@nextgisweb/gui/util/extent";
import { gettext } from "@nextgisweb/pyramid/i18n";
import {
    ButtonControl,
    MapToolbarControl,
} from "@nextgisweb/webmap/map-component";
import type { MapExtent } from "@nextgisweb/webmap/ol/MapStore";
import { EditableItem } from "@nextgisweb/webmap/plugin/layer-editor/EditableItem";
import { ClearAllBtn } from "@nextgisweb/webmap/plugin/layer-editor/modes/ClearAllBtn";
import { MoveMode } from "@nextgisweb/webmap/plugin/layer-editor/modes/MoveMode";
import { RectEditMode } from "@nextgisweb/webmap/plugin/layer-editor/modes/RectEditMode";
import { PreviewMap } from "@nextgisweb/webmap/preview-map";

import type { ExtentRowValue } from "../extent-row";
import { PreviewMapModal } from "../preview-map-modal/PreviewMapModal";
import type { PreviewMapModalProps } from "../preview-map-modal/PreviewMapModal";

import CheckIcon from "@nextgisweb/icon/material/check";

function toOlExtent(
    v?: ExtentRowValue
): [number, number, number, number] | undefined {
    if (!v) return undefined;
    const { left, bottom, right, top } = v;
    if ([left, bottom, right, top].some((x) => x === null || x === undefined))
        return undefined;
    return [left!, bottom!, right!, top!];
}

function polygonToWSEN(poly: Polygon): ExtentRowValue {
    const ext3857 = poly.getExtent();
    const ext = transformExtent(ext3857, "EPSG:3857", "EPSG:4326");
    return {
        left: ext[0],
        bottom: ext[1],
        right: ext[2],
        top: ext[3],
    };
}

interface ExtentEditorModalProps extends PreviewMapModalProps {
    value?: ExtentRowValue;
    onClose: () => void;
    onChange: (v: ExtentRowValue) => void;
}

export function ExtentEditorModal({
    open,
    value,
    onClose,
    onChange,
    ...props
}: ExtentEditorModalProps) {
    const initialOlExtent = useMemo(() => toOlExtent(value), [value]);

    const [source] = useState(() => new VectorSource());
    const [featuresLength, setFeaturesLength] = useState<number | null>(null);

    const [editingMode, setEditingMode] = useState<string | null>(
        RectEditMode.displayName
    );
    useEffect(() => {
        const unChange = source.on("change", () => {
            const len = source.getFeatures().length;
            setFeaturesLength(len);
        });
        return () => {
            unByKey(unChange);
        };
    }, [source]);
    useEffect(() => {
        source.clear();
        if (initialOlExtent) {
            const poly = polygonFromExtent(
                transformExtent(initialOlExtent, "EPSG:4326", "EPSG:3857")
            );
            const f = new Feature({ geometry: poly });
            source.addFeature(f);
        }
    }, [initialOlExtent, source]);

    const initialMapExtent = useMemo<MapExtent | undefined>(() => {
        if (initialOlExtent) {
            return {
                extent: convertWSENToNgwExtent(initialOlExtent),
                padding: DEFAULT_PADDING,
                srs: DEFAULT_SRS,
            };
        }

        return undefined;
    }, [initialOlExtent]);

    const handleApply = () => {
        const feats = source.getFeatures();
        const poly = feats
            .find((f) => f.getGeometry() instanceof Polygon)
            ?.getGeometry() as Polygon | undefined;
        if (!poly) {
            onChange({});
            return;
        }
        onChange(polygonToWSEN(poly));
    };

    return (
        <PreviewMapModal open={open} {...props}>
            <PreviewMap
                style={{ height: "60vh", width: "60vw" }}
                basemap
                initialMapExtent={initialMapExtent}
            >
                <ButtonControl
                    order={1}
                    position="top-right"
                    onClick={onClose}
                    title={gettext("Close")}
                >
                    <CloseIcon />
                </ButtonControl>

                <ButtonControl
                    order={2}
                    position="top-right"
                    onClick={handleApply}
                    title={gettext("Apply")}
                >
                    <CheckIcon />
                </ButtonControl>

                <MapToolbarControl
                    order={10}
                    id="extent-toolbar"
                    position="top-right"
                    margin
                    direction="vertical"
                    style={{ paddingTop: "20px" }}
                    gap={4}
                >
                    <EditableItem
                        enabled
                        source={source}
                        editingMode={editingMode}
                        onEditingMode={setEditingMode}
                        onDirtyChange={() => {}}
                    >
                        <RectEditMode order={1} clearPrevious />
                        <MoveMode disabled={!featuresLength} order={2} />
                        <ClearAllBtn
                            disabled={!featuresLength}
                            order={4}
                            icon={<DeleteIcon />}
                        />
                    </EditableItem>
                </MapToolbarControl>
            </PreviewMap>
        </PreviewMapModal>
    );
}
