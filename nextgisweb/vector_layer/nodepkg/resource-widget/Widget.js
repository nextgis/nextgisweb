import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FileUploader } from "@nextgisweb/file-upload/file-uploader";
import { Checkbox, Collapse, Input, Radio, Select } from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import "./Widget.less";

// prettier-ignore
const uploaderMessages = {
    uploadText: gettext("Select a dataset"),
    helpText: gettext("ESRI Shapefile (zip), GeoPackage, GeoJSON, GML, KML, CSV or XLSX formats are supported. For CSV and XLSX only points are supported, coordinates must be put in lat and lot columns."),
}

const RadioGroup = (props) => (
    <Radio.Group optionType="button" buttonStyle="outline" {...props} />
);

const SourceOptions = observer(({ store }) => {
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

    const brg = (a) => ({
        value: so[a],
        onChange: (e) => {
            runInAction(() => (so[a] = e.target.value));
        },
    });

    const bcb = (a) => ({
        checked: so[a],
        onChange: (e) => {
            runInAction(() => (so[a] = e.target.checked));
        },
    });

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
                        runInAction(() => {
                            so.fid_field = e.target.value;
                        });
                    }}
                />
            </div>
        </>
    );
});

export const Widget = observer(({ store }) => {
    const [layerOpts, setLayerOpts] = useState();

    const { operation, mode, update, source, geometryTypeInitial } = store;

    const modeOpts = useMemo(() => {
        const result = [];
        const add = (value, label) => result.push({ label, value });
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
        const result = [];
        const gti = geometryTypeInitial;
        const btype =
            mode === "gtype"
                ? gti.replace(/^(?:MULTI)?(.*?)Z?$/, "$1")
                : undefined;
        const add = (value, label) => {
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
        setLayerOpts(null);
        update({ sourceLayer: null });
        if (!source) return;
        (async () => {
            const post = route("vector_layer.inspect").post;
            let dset;
            try {
                dset = await post({ json: { id: source.id } });
            } catch (err) {
                errorModal(err);
                update({ source: null });
            }
            setLayerOpts(dset.layers.map((i) => ({ value: i, label: i })));
            update({ sourceLayer: dset.layers[0] });
        })();
    }, [store, source, update]);

    const bval = useCallback(
        (attr) => ({
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
                        onChange={(value) => update({ source: value })}
                        onUploading={(value) => {
                            store.uploding = value;
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
            {["empty", "gtype"].includes(mode) && (
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
});

Widget.title = gettext("Vector layer");
Widget.activateOn = { create: true };
Widget.order = -50;
