import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { GeometryType } from "@nextgisweb/feature-layer/type";
import { FileUploader } from "@nextgisweb/file-upload/file-uploader";
import type { UploaderMeta } from "@nextgisweb/file-upload/file-uploader";
import { Checkbox, Collapse, Input, Radio, Select } from "@nextgisweb/gui/antd";
import type {
    CheckboxProps,
    RadioGroupProps,
    SelectProps,
} from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";

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
            value: so[a],
            onChange: (e) => {
                store.updateSourceOptions({ [a]: e.target.value });
            },
        };
    };

    const bcb = (key: string): CheckboxProps => {
        const a = key as keyof typeof so;
        return {
            checked: !!so[a],
            onChange: (e) => {
                store.updateSourceOptions({ [a]: e.target.checked });
            },
        };
    };

    return (
        <>
            <label>{gettext("Fix errors")}</label>
            <div className="group">
                <RadioGroup options={optsFixErrors} {...brg("fix_errors")} />
                <Checkbox {...bcb("skip_errors")}>
                    <>{gettext("Skip features with unfixable errors")}</>
                </Checkbox>
            </div>

            <label>{gettext("Geometry type")}</label>
            <div className="group">
                <RadioGroup
                    options={optsGType}
                    {...brg("cast_geometry_type")}
                />
                <Checkbox {...bcb("skip_other_geometry_types")}>
                    {/* prettier-ignore */}
                    <>{gettext("Only load features of the selected geometry type")}</>
                </Checkbox>
            </div>

            <label>{gettext("Multi-geometry")}</label>
            <RadioGroup options={optsAutoYesNo} {...brg("cast_is_multi")} />

            <label>{gettext("Z-coordinate")}</label>
            <RadioGroup options={optsAutoYesNo} {...brg("cast_has_z")} />

            <label>{gettext("FID source")}</label>
            <div className="group">
                <RadioGroup options={optsFidSource} {...brg("fid_source")} />
                <Input
                    value={so.fid_field}
                    onChange={(e) => {
                        store.updateSourceOptions({
                            fid_field: e.target.value,
                        });
                    }}
                />
            </div>
        </>
    );
});

SourceOptions.displayName = "SourceOptions";

export const Widget: EditorWidgetComponent<EditorWidgetProps<Store>> = observer(
    ({ store }) => {
        const [layerOpts, setLayerOpts] = useState<Option[]>();

        const { operation, mode, update, source, geometryTypeInitial } = store;

        const modeOpts = useMemo(() => {
            const result: Option<Mode>[] = [];
            const add = (value: Mode, label: string) =>
                result.push({ label, value });
            if (operation === "create") {
                add("file", gettext("Load features from file"));
                add("empty", gettext("Create empty layer"));
            } else {
                add("keep", gettext("Keep existing layer features"));
                add("gtype", gettext("Change geometry type"));
                add("file", gettext("Replace layer features from file"));
                add("delete", gettext("Delete all features from layer"));
            }
            update({ mode: result[0].value });
            return result;
        }, [operation, update]);

        const gtypeOpts = useMemo(() => {
            const result: Option<GeometryType>[] = [];
            const gti = geometryTypeInitial;
            const btype =
                mode === "gtype"
                    ? gti && gti.replace(/^(?:MULTI)?(.*?)Z?$/, "$1")
                    : undefined;
            const add = (value: GeometryType, label: string) => {
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
            update({ geometryType: gti ? gti : result[0].value });
            return result;
        }, [mode, update, geometryTypeInitial]);

        useEffect(() => {
            setLayerOpts(undefined);
            update({ sourceLayer: null });
            if (!source) return;
            (async () => {
                try {
                    const dset = await route("vector_layer.inspect").post({
                        json: { id: source.id },
                    });

                    setLayerOpts(
                        dset.layers.map((i) => ({ value: i, label: i }))
                    );
                    update({ sourceLayer: dset.layers[0] });
                } catch (err) {
                    errorModal(err as ApiError);
                    update({ source: null });
                }
            })();
        }, [store, source, update]);

        const bval = useCallback(
            (attr: keyof typeof store): SelectProps => ({
                value: store[attr],
                onChange: (v) => {
                    update({ [attr]: v });
                },
            }),
            [store, update]
        );

        const onFileChange = useCallback(
            (value?: UploaderMeta) =>
                update({
                    source: value
                        ? Array.isArray(value)
                            ? value[0]
                            : value
                        : null,
                }),
            [update]
        );

        return (
            <div className="ngw-vector-layer-resource-widget">
                <Select className="mode" options={modeOpts} {...bval("mode")} />
                {mode === "file" && (
                    <>
                        <FileUploader
                            onChange={onFileChange}
                            onUploading={(value) => {
                                store.uploading = value;
                            }}
                            showMaxSize
                            {...uploaderMessages}
                        />
                        {layerOpts && layerOpts.length > 1 && (
                            <>
                                <label>{gettext("Source layer")}</label>
                                <Select
                                    className="row"
                                    options={layerOpts}
                                    {...bval("sourceLayer")}
                                />
                            </>
                        )}
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
                {store.confirmMsg && (
                    <Checkbox
                        checked={store.confirm}
                        onChange={({ target: { checked } }) => {
                            update({ confirm: checked });
                        }}
                    >
                        {store.confirmMsg}
                    </Checkbox>
                )}
                {mode === "file" && (
                    <Collapse
                        size="small"
                        items={[
                            {
                                key: "default",
                                label: gettext("Advanced options"),
                                children: <SourceOptions {...{ store }} />,
                            },
                        ]}
                    />
                )}
            </div>
        );
    }
);

Widget.displayName = "Widget";
Widget.title = gettext("Vector layer");
Widget.activateOn = { create: true };
Widget.order = -50;
