import PropTypes from "prop-types";

import { useEffect, useState, useCallback, useMemo } from "react";

import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";

import { errorModal } from "@nextgisweb/gui/error";
import {
    Checkbox,
    FieldsForm,
    Form,
    Select,
} from "@nextgisweb/gui/fields-form";
import { ResourceSelectMultiple } from "@nextgisweb/resource/field/ResourceSelectMultiple";

import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import i18n from "@nextgisweb/pyramid/i18n";

import settings from "@nextgisweb/pyramid/settings!feature_layer";

import { ExtentInput } from "./ExtentInput";
import { useExportFeatureLayer } from "../hook/useExportFeatureLayer";

const exportFormats = settings.export_formats;

const srsListToOptions = (srsList) => {
    return srsList.map((srs) => {
        return {
            label: srs.display_name,
            value: srs.id,
        };
    });
};

const fieldListToOptions = (fieldList) => {
    return fieldList.map((field) => {
        return {
            label: field.display_name,
            value: field.keyname,
        };
    });
};

export function ExportForm({ id, pick, multiple }) {
    const [staffLoading, setStaffLoading] = useState(true);

    const [urlParams, setUrlParams] = useState({});

    const { exportFeatureLayer, exportLoading } = useExportFeatureLayer({ id });
    const { makeSignal } = useAbortController();
    const [srsOptions, setSrsOptions] = useState([]);
    const [fieldOptions, setFieldOptions] = useState([]);
    const [defaultSrs, setDefaultSrs] = useState();
    const [format, setFormat] = useState(exportFormats[0].name);
    const [fields, setFields] = useState([]);
    const [isReady, setIsReady] = useState(false);
    const form = Form.useForm()[0];

    const loading = staffLoading || exportLoading;

    const initialValues = useMemo(() => {
        const initialVals = {
            format,
            fields: fieldOptions.map((field) => field.value),
            srs: defaultSrs,
            fid: "ngw_id",
            encoding: "UTF-8",
            display_name: false,
            zipped: !!multiple,
            ...urlParams,
        };
        return initialVals;
    }, [defaultSrs, fieldOptions, format, multiple, urlParams]);

    const load = useCallback(async () => {
        try {
            const signal = makeSignal();
            const promises = [route("spatial_ref_sys.collection")];
            if (id !== undefined) {
                promises.push(route("resource.item", id));
            }
            const [srsInfo, itemInfo] = await Promise.all(
                promises.map((r) => r.get({ signal }))
            );
            setSrsOptions(srsListToOptions(srsInfo));
            if (itemInfo) {
                setDefaultSrs(itemInfo[itemInfo.resource.cls].srs.id);
                setFieldOptions(
                    fieldListToOptions(itemInfo.feature_layer.fields)
                );
            } else {
                const defSrs = srsInfo.find((srs) => srs.id === 3857);
                if (defSrs) {
                    setDefaultSrs(defSrs.id);
                }
            }
        } catch (err) {
            errorModal(err);
        } finally {
            setStaffLoading(false);
        }
    }, [id, makeSignal]);

    useEffect(() => {
        const {
            resources: resStr,
            fields: fieldsStr,
            ...rest
        } = Object.fromEntries(new URL(location.href).searchParams.entries());
        const urlParamsToset = { ...rest };
        if (resStr) {
            urlParamsToset.resources = resStr.split(",").map(Number);
        }
        if (fieldsStr) {
            urlParamsToset.fields = fieldsStr.split(",").map(Number);
        }
        setUrlParams(urlParamsToset);
    }, []);

    useEffect(() => load(), [load]);

    useEffect(() => {
        const exportFormat = exportFormats.find((f) => f.name === format);
        const dscoCfg = (exportFormat && exportFormat.dsco_configurable) ?? [];
        let multipleFields = [];
        const dscoFields = [];
        const dscoFieldsValues = {};
        for (const d of dscoCfg) {
            const [name, value] = d.split(":");
            dscoFields.push({
                name,
                label: name,
            });
            if (isReady) {
                dscoFieldsValues[name] = value;
            }
        }
        if (multipleFields && pick) {
            multipleFields = [
                {
                    name: "resources",
                    label: i18n.gettext("Resources"),
                    widget: ResourceSelectMultiple,
                    inputProps: {
                        pickerOptions: {
                            traverseClasses: ["resource_group"],
                            requireClass: "vector_layer",
                            requireInterface: "IFeatureLayer",
                            hideUnavailable: true,
                        },
                    },
                },
            ];
        }
        if (isReady && Object.keys(dscoFieldsValues).length) {
            form.setFieldsValue(dscoFieldsValues);
        }
        setFields([
            ...multipleFields,
            {
                name: "format",
                label: i18n.gettext("Format"),
                widget: Select,
                choices: exportFormats.map((format) => ({
                    value: format.name,
                    label: format.display_name,
                })),
            },
            ...dscoFields,
            {
                name: "srs",
                label: i18n.gettext("SRS"),
                widget: Select,
                choices: srsOptions,
            },
            {
                name: "encoding",
                label: i18n.gettext("Encoding"),
                widget: Select,
                choices: [
                    { value: "UTF-8", label: "UTF-8" },
                    { value: "CP1251", label: "Windows-1251" },
                    { value: "CP1252", label: "Windows-1252" },
                ],
            },
            {
                name: "fid",
                label: i18n.gettext("FID field"),
            },
            {
                name: "display_name",
                label: i18n.gettext(
                    "Use field display names instead of keynames"
                ),
                widget: Checkbox,
            },
            {
                name: "fields",
                label: i18n.gettext("Fields"),
                widget: Select,
                mode: "multiple",
                included: !multiple,
                choices: fieldOptions,
            },
            {
                name: "extent",
                label: i18n.gettext("Limit by extent"),
                widget: ExtentInput,
            },
            {
                name: "ilike",
                label: i18n.gettext("Filter text"),
            },
            {
                name: "zipped",
                label: i18n.gettext("Zip archive"),
                widget: Checkbox,
                included: !multiple,
                disabled: !exportFormat.single_file || multiple,
            },
        ]);
    }, [srsOptions, fieldOptions, format, isReady, form, multiple, pick]);

    const onChange = (e) => {
        if ("format" in e.value) {
            setFormat(e.value.format);
        }
    };

    if (loading) {
        return <LoadingWrapper />;
    }

    return (
        <FieldsForm
            fields={fields}
            form={form}
            whenReady={() => {
                setIsReady(true);
            }}
            onChange={onChange}
            initialValues={initialValues}
            labelCol={{ span: 6 }}
        >
            <Form.Item>
                <SaveButton
                    onClick={() => {
                        exportFeatureLayer(form.getFieldsValue());
                    }}
                    icon={null}
                >
                    {i18n.gettext("Save")}
                </SaveButton>
            </Form.Item>
        </FieldsForm>
    );
}

ExportForm.propTypes = {
    id: PropTypes.number,
    multiple: PropTypes.bool,
    pick: PropTypes.bool,
};
