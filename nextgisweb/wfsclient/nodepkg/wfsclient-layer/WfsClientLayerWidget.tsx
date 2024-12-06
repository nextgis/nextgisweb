import { observer } from "mobx-react-lite";
import { useCallback, useMemo, useState } from "react";

import { InputNumber, Select } from "@nextgisweb/gui/antd";
import { LotMV } from "@nextgisweb/gui/arm";
import { AutoCompleteInput } from "@nextgisweb/gui/component";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { route } from "@nextgisweb/pyramid/api";
import { useCache } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelectRef } from "@nextgisweb/resource/component";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";

import type { WfsClientLayerStore } from "./WfsClientLayerStore";

const msgAutodetect = gettext("Autodetect");

const geometries: Record<string, string> = {
    "Point": "POINT",
    "LineString": "LINESTRING",
    "LinearRing": "LINESTRING",
    "Polygon": "POLYGON",
    "MultiPoint": "MULTIPOINT",
    "MultiCurve": "MULTILINESTRING",
    "MultiPolygon": "MULTIPOLYGON",
    "MultiSurface": "MULTIPOLYGON",
    "MultiSolid": "MULTIPOLYGON",
    "MultiGeometry": "GEOMETRYCOLLECTION",
};

async function inspectConnectionFetch(
    [connectionId]: [number],
    options: { signal: AbortSignal }
) {
    const data = await route("wfsclient.connection.inspect", {
        id: connectionId,
    }).get({ signal: options.signal });
    const result: Record<string, number> = {};
    for (const { name, srid } of data.layers) {
        result[name] = srid;
    }
    return result;
}

async function inspectLayerFetch(
    [connectionId, layer]: [number, string],
    options: { signal: AbortSignal }
) {
    const data = await route("wfsclient.connection.inspect.layer", {
        id: connectionId,
        layer,
    }).get({ signal: options.signal });
    const result: Record<string, string> = {};
    for (const { name, type } of data.fields) {
        if (type[0] !== "http://www.opengis.net/gml/3.2") {
            continue;
        }
        const typeNorm = type[1].replace(/(Property)?Type$/, "");
        if (typeNorm === "Geometry" || typeNorm in geometries) {
            result[name] = geometries[typeNorm];
        }
    }
    return result;
}

const geometryTypeOptions = [
    { value: "POINT", label: gettext("Point") },
    { value: "LINESTRING", label: gettext("Line") },
    { value: "POLYGON", label: gettext("Polygon") },
    { value: "MULTIPOINT", label: gettext("Multipoint") },
    { value: "MULTILINESTRING", label: gettext("Multiline") },
    { value: "MULTIPOLYGON", label: gettext("Multipolygon") },
];

type FocusedField = "layerName" | "columnGeom" | null;
const connectionFields: FocusedField[] = ["layerName"];
const layerFields: FocusedField[] = ["columnGeom"];

const SKIPPED = { status: "skipped" as const };
type OrSkipped<V extends (...args: never[]) => unknown> =
    | ReturnType<V>
    | typeof SKIPPED;

const fieldsOptions = [
    { value: "keep", label: gettext("Keep existing definitions untouched") },
    { value: "update", label: gettext("Update definitions from the server") },
];

export const WfsClientLayerWidget: EditorWidgetComponent<
    EditorWidgetProps<WfsClientLayerStore>
> = observer(({ store }: EditorWidgetProps<WfsClientLayerStore>) => {
    const [focusedField, setFocusedField] = useState<FocusedField>(null);

    const inspectConnection = useCache(inspectConnectionFetch);
    const inspectLayer = useCache(inspectLayerFetch);

    const connectionId = store.connection.value?.id;
    const layerName = store.layerName.value;

    let connectionInfo: OrSkipped<typeof inspectConnection> = SKIPPED;
    if (connectionId) {
        const cachedOnly = !connectionFields.includes(focusedField!);
        connectionInfo = inspectConnection([connectionId], { cachedOnly });
    }

    let layerInfo: OrSkipped<typeof inspectLayer> = SKIPPED;
    if (connectionId && layerName) {
        const cachedOnly = !layerFields.includes(focusedField!);
        layerInfo = inspectLayer([connectionId, layerName], { cachedOnly });
    }

    const layerOptions = useMemo(() => {
        if (connectionInfo?.status !== "ready") return undefined;
        return Object.keys(connectionInfo.data).map((layer) => ({
            value: layer,
            label: layer,
        }));
    }, [connectionInfo]);

    const columnGeomOptions = useMemo(() => {
        if (layerInfo?.status !== "ready") return undefined;
        return Object.keys(layerInfo.data).map((geom) => ({
            value: geom,
            label: geom,
        }));
    }, [layerInfo]);

    const autocompleteProps = useCallback(
        (
            field: NonNullable<FocusedField>,
            { status }: { status: unknown | "skipped" },
            options: { label: string; value: string }[] | undefined
        ) => ({
            onFocus: () => setFocusedField(field),
            onBlur: () => setFocusedField(null),
            loading:
                status === "loading" && focusedField === field
                    ? true
                    : undefined,
            style: { width: "100%" },
            options,
        }),
        [focusedField]
    );

    const updateGeometryType = (value: string) => {
        if (layerInfo.status === "ready") {
            store.columnGeom.value = value;
            store.geometryType.value = layerInfo.data[value] ?? null;
        }
    };

    const updateSrid = (value: string) => {
        if (connectionInfo.status === "ready") {
            store.layerName.value = value;
            store.geometrySrid.value = connectionInfo.data[value];
        }
    };

    return (
        <Area pad cols={["1fr", "1fr"]}>
            <LotMV
                row
                label={gettext("Connection")}
                value={store.connection}
                component={ResourceSelectRef}
                props={{
                    pickerOptions: {
                        requireClass: "wfsclient_connection",
                        initParentId: store.composite.parent,
                    },
                    style: { width: "100%" },
                }}
            />

            <Lot label={gettext("Layer")}>
                <AutoCompleteInput
                    value={store.layerName.value}
                    {...autocompleteProps(
                        "layerName",
                        connectionInfo,
                        layerOptions
                    )}
                    onChange={(value) => {
                        updateSrid(value);
                    }}
                />
            </Lot>

            <LotMV
                label={gettext("SRID")}
                value={store.geometrySrid}
                component={InputNumber}
                props={{
                    placeholder: msgAutodetect,
                    style: { width: "100%" },
                }}
            />
            <Lot label={gettext("Geometry column")}>
                <AutoCompleteInput
                    value={store.columnGeom.value}
                    {...autocompleteProps(
                        "columnGeom",
                        layerInfo,
                        columnGeomOptions
                    )}
                    onChange={(value) => {
                        updateGeometryType(value);
                    }}
                />
            </Lot>
            <LotMV
                label={gettext("Geometry type")}
                value={store.geometryType}
                component={Select}
                props={{
                    allowClear: true,
                    placeholder: msgAutodetect,
                    style: { width: "100%" },
                    options: geometryTypeOptions,
                }}
            />
            <LotMV
                row
                label={gettext("Attribute definitions")}
                value={store.fields}
                component={Select}
                props={{
                    options: fieldsOptions,
                    style: { width: "100%" },
                }}
            />
        </Area>
    );
});

WfsClientLayerWidget.displayName = "WfsClientLayerWidget";
WfsClientLayerWidget.title = gettext("WFS layer");
WfsClientLayerWidget.activateOn = { create: true };
WfsClientLayerWidget.order = 10;
