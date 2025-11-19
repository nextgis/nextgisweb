import Feature from "ol/Feature";
import type { Extent } from "ol/extent";
import Polygon, { fromExtent as polygonFromExtent } from "ol/geom/Polygon";
import { get as getProjection, transformExtent } from "ol/proj";
import VectorSource from "ol/source/Vector";
import { useEffect, useMemo, useState } from "react";

import {
    DEFAULT_PADDING,
    DEFAULT_SRS,
} from "@nextgisweb/feature-layer/geometry-editor/constant";
import { CloseIcon } from "@nextgisweb/gui/icon";
import {
    clampExtent,
    convertWSENToNgwExtent,
} from "@nextgisweb/gui/util/extent";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ButtonControl } from "@nextgisweb/webmap/map-component";
import type { MapExtent } from "@nextgisweb/webmap/ol/MapStore";
import { PreviewMap } from "@nextgisweb/webmap/preview-map";
import type { ExtentWSEN } from "@nextgisweb/webmap/type/api";
import { normalizeExtent } from "@nextgisweb/webmap/utils/normalizeExtent";

import type { ExtentRowValue } from "../extent-row";
import { toOlExtent } from "../extent-row/util";
import { PreviewMapModal } from "../preview-map-modal/PreviewMapModal";
import type { PreviewMapModalProps } from "../preview-map-modal/PreviewMapModal";

import { ExtentEditorControlPanel } from "./ExtentEditorControlPanel";

import CheckIcon from "@nextgisweb/icon/material/check";

interface ExtentEditorModalProps extends PreviewMapModalProps {
    value?: ExtentRowValue;
    onClose: () => void;
    onChange: (v: ExtentRowValue) => void;
}

function extentsEqual(a?: Extent, b?: Extent, epsilon = 1e-6): boolean {
    if (!a || !b) {
        return false;
    }
    return (
        Math.abs(a[0] - b[0]) < epsilon &&
        Math.abs(a[1] - b[1]) < epsilon &&
        Math.abs(a[2] - b[2]) < epsilon &&
        Math.abs(a[3] - b[3]) < epsilon
    );
}

function clampExtentToProj(extent: ExtentWSEN): ExtentWSEN {
    const proj = getProjection("EPSG:3857");
    const projExtent = proj?.getExtent();
    if (!projExtent) {
        return extent;
    }
    const projExtent4326 = transformExtent(
        projExtent,
        "EPSG:3857",
        "EPSG:4326"
    );

    return clampExtent(extent, projExtent4326) as ExtentWSEN;
}

export function ExtentEditorModal({
    open,
    value,
    onClose,
    onChange,
    ...props
}: ExtentEditorModalProps) {
    const initialOlExtent = useMemo(() => {
        const wsen = toOlExtent(value);
        if (wsen) {
            return clampExtentToProj(normalizeExtent(wsen));
        }
    }, [value]);

    const projExtent = useMemo(() => {
        const proj = getProjection("EPSG:3857");
        return proj?.getExtent();
    }, []);

    const [source] = useState(() => new VectorSource({ wrapX: false }));

    useEffect(() => {
        source.clear();
        if (initialOlExtent) {
            const extent3857 = transformExtent(
                initialOlExtent,
                "EPSG:4326",
                "EPSG:3857"
            );

            if (projExtent && extentsEqual(extent3857, projExtent)) {
                return;
            }

            const poly = polygonFromExtent(extent3857);
            const f = new Feature({ geometry: poly });
            source.addFeature(f);
        }
    }, [initialOlExtent, projExtent, source]);

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

        const ext3857 = poly.getExtent();
        const ext = clampExtentToProj(
            transformExtent(ext3857, "EPSG:3857", "EPSG:4326") as ExtentWSEN
        );

        onChange({
            left: ext[0],
            bottom: ext[1],
            right: ext[2],
            top: ext[3],
        });
    };

    return (
        <PreviewMapModal open={open} {...props}>
            <PreviewMap
                style={{ height: "60vh", width: "60vw" }}
                basemap
                initialMapExtent={initialMapExtent}
                multiWorld={false}
                extent={projExtent}
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

                <ExtentEditorControlPanel source={source} />
            </PreviewMap>
        </PreviewMapModal>
    );
}
