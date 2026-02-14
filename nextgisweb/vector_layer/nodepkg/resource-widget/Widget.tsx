import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { FeatureLayerGeometryType } from "@nextgisweb/feature-layer/type/api";
import { FileUploader } from "@nextgisweb/file-upload/file-uploader";
import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import {
    CheckboxValue,
    Collapse,
    Input,
    Radio,
    Select,
    Space,
} from "@nextgisweb/gui/antd";
import type { RadioGroupProps, SelectProps } from "@nextgisweb/gui/antd";
import { errorModal, isAbortError } from "@nextgisweb/gui/error";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelectRef } from "@nextgisweb/resource/component";
import type { EditorWidget } from "@nextgisweb/resource/type";

import type { Mode, Store } from "./Store";

import "./Widget.less";

interface Option<T = string> {
    label: string;
    value: T;
}

// prettier-ignore
const uploaderMessages = {
    uploadText: gettext("Select a dataset"),
    helpText: gettext("ESRI Shapefile (zip), GeoPackage, GeoJSON, GML, KML, CSV or XLSX formats are supported. For CSV and XLSX only points are supported, coordinates must be put in lat and lot columns."),
}
// prettier-ignore
const msgInspect = gettext("Files uploaded, post-processing on the server in progress...");

const msgFixErrors = gettext("Fix errors");
const msgSkipUnfixable = gettext("Skip features with unfixable errors");
const msgGeomType = gettext("Geometry type");
const msgGeomTypeSkip = gettext("Skip features with other geometry types");
const msgGeomTypeMulti = gettext("Multi-geometry");
const msgGeomTypeZ = gettext("Z-coordinate");
const msgFidSource = gettext("FID source");

const RadioGroup = (props: RadioGroupProps) => (
    <Radio.Group optionType="button" buttonStyle="outline" {...props} />
);

const SourceOptions = observer(({ store }: { store: Store }) => {
    const so = store.sourceOptions;
    const optsFixErrors = useMemo(() => {
        return [
            { value: "LOSSY", label: gettext("Whenever possible") },
            { value: "SAFE", label: gettext("Without losing data") },
            { value: "NONE", label: gettext("None") },
        ];
    }, []);

    const optsGType = useMemo(() => {
        return [
            { value: "NONE", label: gettext("Auto") },
            { value: "POINT", label: gettext("Point") },
            { value: "LINESTRING", label: gettext("Line") },
            { value: "POLYGON", label: gettext("Polygon") },
        ];
    }, []);

    const optsAutoYesNo = useMemo(() => {
        return [
            { value: "NONE", label: gettext("Auto") },
            { value: "YES", label: gettext("Yes") },
            { value: "NO", label: gettext("No") },
        ];
    }, []);

    const optsFidSource = useMemo(() => {
        return [
            { value: "AUTO", label: gettext("Auto") },
            { value: "SEQUENCE", label: gettext("Sequence") },
            { value: "FIELD", label: gettext("Field") },
        ];
    }, []);

    const brg = (key: string): RadioGroupProps => {
        const a = key as keyof typeof so;
        return {
            value: so[a] ?? "NONE",
            onChange: (e) => {
                let value = e.target.value;
                if (value === "NONE" && a !== "fix_errors") value = null;
                store.updateSourceOptions({ [a]: value });
            },
        };
    };

    const bcb = (key: string) => {
        const a = key as keyof typeof so;
        return {
            value: !!so[a],
            onChange: (value: boolean) => {
                store.updateSourceOptions({ [a]: value });
            },
        };
    };

    return (
        <Area>
            <Lot label={msgFixErrors}>
                <Space orientation="horizontal">
                    <RadioGroup
                        options={optsFixErrors}
                        {...brg("fix_errors")}
                    />
                    <CheckboxValue {...bcb("skip_errors")}>
                        {msgSkipUnfixable}
                    </CheckboxValue>
                </Space>
            </Lot>

            <Lot label={msgGeomType}>
                <Space orientation="horizontal">
                    <RadioGroup
                        options={optsGType}
                        {...brg("cast_geometry_type")}
                    />
                    <CheckboxValue
                        {...bcb("skip_other_geometry_types")}
                        disabled={
                            store.sourceOptions.cast_geometry_type === null
                        }
                    >
                        {msgGeomTypeSkip}
                    </CheckboxValue>
                </Space>
            </Lot>

            <Lot label={msgGeomTypeMulti}>
                <RadioGroup options={optsAutoYesNo} {...brg("cast_is_multi")} />
            </Lot>

            <Lot label={msgGeomTypeZ}>
                <RadioGroup options={optsAutoYesNo} {...brg("cast_has_z")} />
            </Lot>

            <Lot label={msgFidSource}>
                <Space orientation="horizontal">
                    <RadioGroup
                        options={optsFidSource}
                        {...brg("fid_source")}
                    />
                    <Input
                        value={so.fid_field}
                        onChange={(e) => {
                            store.updateSourceOptions({
                                fid_field: e.target.value,
                            });
                        }}
                    />
                </Space>
            </Lot>
        </Area>
    );
});

SourceOptions.displayName = "SourceOptions";

export const Widget: EditorWidget<Store> = observer(({ store }) => {
    const [layerOpts, setLayerOpts] = useState<Option[]>();

    const { mode, update, geometryTypeInitial, confirmMsg, confirm } = store;
    const operation = store.composite.operation;

    const modeOpts = useMemo(() => {
        const result: Option<Mode>[] = [];
        const add = (value: Mode, label: string) =>
            result.push({ label, value });
        if (operation === "create") {
            add("file", gettext("Load features from file"));
            add("copy", gettext("Copy features from layer"));
            add("empty", gettext("Create empty layer"));
        } else {
            add("keep", gettext("Keep existing features"));
            add("gtype", gettext("Change geometry type"));
            add("file", gettext("Replace features from file"));
            add("delete", gettext("Delete all features"));
        }

        return result;
    }, [operation]);

    const gtypeOpts = useMemo(() => {
        const result: Option<FeatureLayerGeometryType>[] = [];
        const gti = geometryTypeInitial;
        const btype =
            mode === "gtype"
                ? gti && gti.replace(/^(?:MULTI)?(.*?)Z?$/, "$1")
                : undefined;
        const add = (value: FeatureLayerGeometryType, label: string) => {
            if (btype) {
                if (!value.includes(btype)) return;
                if (value === gti) label += " (" + gettext("current") + ")";
            }
            result.push({ label, value });
        };
        add("POINT", gettext("Point"));
        add("LINESTRING", gettext("Line"));
        add("POLYGON", gettext("Polygon"));
        add("MULTIPOINT", gettext("Multipoint"));
        add("MULTILINESTRING", gettext("Multiline"));
        add("MULTIPOLYGON", gettext("Multipolygon"));
        add("POINTZ", gettext("Point Z"));
        add("LINESTRINGZ", gettext("Line Z"));
        add("POLYGONZ", gettext("Polygon Z"));
        add("MULTIPOINTZ", gettext("Multipoint Z"));
        add("MULTILINESTRINGZ", gettext("Multiline Z"));
        add("MULTIPOLYGONZ", gettext("Multipolygon Z"));
        return result;
    }, [geometryTypeInitial, mode]);

    useEffect(() => {
        update({
            geometryType:
                mode === "gtype"
                    ? geometryTypeInitial
                    : mode === "empty"
                      ? "POINT"
                      : null,
        });
    }, [geometryTypeInitial, mode, update]);

    const inspectUpload = useCallback(
        async (value: FileMeta[], { signal }: { signal: AbortSignal }) => {
            const fileMeta: FileMeta | undefined = value
                ? Array.isArray(value)
                    ? value[0]
                    : value
                : undefined;

            setLayerOpts(undefined);
            update({ sourceLayer: null });
            if (!fileMeta) return;

            try {
                const dset = await route("vector_layer.inspect").post({
                    json: { id: fileMeta.id },
                    signal,
                });

                setLayerOpts(dset.layers.map((i) => ({ value: i, label: i })));
                update({ sourceLayer: dset.layers[0] });
            } catch (err) {
                if (!isAbortError(err)) {
                    errorModal(err);
                }
                store.setSource(null);
                throw err;
            }
        },
        [update, store]
    );

    const bval = useCallback(
        (attr: keyof typeof store): SelectProps => ({
            value: store[attr],
            onChange: (v) => {
                update({ [attr]: v });
            },
        }),
        [store, update]
    );

    return (
        <div className="ngw-vector-layer-resource-widget">
            <Select className="mode" options={modeOpts} {...bval("mode")} />
            {mode === "file" && (
                <>
                    <FileUploader
                        fileMeta={store.source ?? undefined}
                        onChange={store.setSource}
                        onUploading={store.setUploading}
                        afterUpload={[
                            {
                                message: msgInspect,
                                loader: inspectUpload,
                            },
                        ]}
                        showMaxSize
                        {...uploaderMessages}
                    />

                    {layerOpts && layerOpts.length > 1 && (
                        <>
                            <label>{gettext("Source layer")}</label>
                            <Select
                                disabled={layerOpts?.length === 1}
                                className="row"
                                options={layerOpts}
                                {...bval("sourceLayer")}
                            />
                        </>
                    )}
                </>
            )}
            {mode === "copy" && (
                <>
                    <label>{gettext("Source layer")}</label>
                    <ResourceSelectRef
                        className="row"
                        pickerOptions={{
                            requireInterface: "IFeatureLayer",
                            initParentId: store.composite.parent,
                        }}
                        {...bval("copyResource")}
                    />
                </>
            )}
            {["empty", "gtype"].includes(mode || "") && (
                <>
                    <label>{gettext("Geometry type")}</label>
                    <Select
                        className="row"
                        options={gtypeOpts}
                        {...bval("geometryType")}
                    />
                </>
            )}
            {confirmMsg && (
                <CheckboxValue
                    value={confirm}
                    onChange={(value) => {
                        update({ confirm: value });
                    }}
                >
                    {confirmMsg}
                </CheckboxValue>
            )}
            {mode === "file" && (
                <Collapse
                    size="small"
                    ghost={true}
                    styles={{
                        header: { paddingInline: 0, paddingBlockStart: 0 },
                        body: { paddingInline: 0 },
                    }}
                    items={[
                        {
                            key: "default",
                            label: gettext("Advanced options"),
                            children: <SourceOptions store={store} />,
                        },
                    ]}
                />
            )}
        </div>
    );
});

Widget.displayName = "Widget";
Widget.title = gettext("Vector layer");
Widget.activateOn = { create: true };
Widget.order = -50;
