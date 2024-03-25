import { useCallback, useEffect, useMemo, useState } from "react";

import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import {
    Checkbox,
    FieldsForm,
    Form,
    Select,
} from "@nextgisweb/gui/fields-form";
import type { FormField } from "@nextgisweb/gui/fields-form";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!feature_layer";
import { ResourceSelectMultiple } from "@nextgisweb/resource/field/ResourceSelectMultiple";
import type { SRSRead } from "@nextgisweb/spatial-ref-sys/type/api";

import { useExportFeatureLayer } from "../hook/useExportFeatureLayer";
import type { FeatureLayerField } from "../type";

import { ExtentInput } from "./ExtentInput";

interface ExportFormProps {
    id: number;
    pick: boolean;
    multiple?: boolean;
}

interface SrsOption {
    label: string;
    value: number;
}
interface FieldOption {
    label: string;
    value: string;
}

const exportFormats = settings.export_formats;

const srsListToOptions = (srsList: SRSRead[]): SrsOption[] =>
    srsList.map((srs) => ({
        label: srs.display_name,
        value: srs.id,
    }));

const fieldListToOptions = (fieldList: FeatureLayerField[]) => {
    return fieldList.map((field) => {
        return {
            label: field.display_name,
            value: field.keyname,
        };
    });
};

export function ExportForm({ id, pick, multiple }: ExportFormProps) {
    const [staffLoading, setStaffLoading] = useState(true);

    const [urlParams, setUrlParams] = useState({});

    const { exportFeatureLayer, exportLoading } = useExportFeatureLayer({ id });
    const { makeSignal } = useAbortController();
    const [srsOptions, setSrsOptions] = useState<SrsOption[]>([]);
    const [fieldOptions, setFieldOptions] = useState<FieldOption[]>([]);
    const [defaultSrs, setDefaultSrs] = useState<number>();
    const [format, setFormat] = useState(exportFormats[0].name);
    const [fields, setFields] = useState<FormField[]>([]);
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
            const srsInfo = await route("spatial_ref_sys.collection").get({
                signal,
            });
            setSrsOptions(srsListToOptions(srsInfo));
            let itemInfo = null;
            if (id !== undefined) {
                itemInfo = await route("resource.item", id).get({
                    signal,
                });
            }

            if (itemInfo && itemInfo.feature_layer) {
                const cls = itemInfo.resource.cls as "vector_layer";
                const vectorLayer = itemInfo[cls];
                if (vectorLayer) {
                    setDefaultSrs(vectorLayer.srs.id);
                }
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
            errorModal(err as ApiError);
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
        const urlParamsToset: Record<string, string | number[]> = { ...rest };
        if (resStr) {
            urlParamsToset.resources = resStr.split(",").map(Number);
        }
        if (fieldsStr) {
            urlParamsToset.fields = fieldsStr.split(",").map(Number);
        }
        setUrlParams(urlParamsToset);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const exportFormat = exportFormats.find((f) => f.name === format);
        const dscoCfg = (exportFormat && exportFormat.dsco_configurable) ?? [];
        let multipleFields: FormField[] = [];
        const dscoFields: FormField[] = [];
        const dscoFieldsValues: Record<string, string> = {};
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
                    label: gettext("Resources"),
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

        const fieldsToSet = [
            ...multipleFields,
            {
                name: "format",
                label: gettext("Format"),
                widget: Select,
                choices: exportFormats.map((format) => ({
                    value: format.name,
                    label: format.display_name,
                })),
            },
            ...dscoFields,
            {
                name: "srs",
                label: gettext("SRS"),
                widget: Select,
                choices: srsOptions,
            },
            {
                name: "encoding",
                label: gettext("Encoding"),
                widget: Select,
                choices: [
                    { value: "UTF-8", label: "UTF-8" },
                    { value: "CP1251", label: "Windows-1251" },
                    { value: "CP1252", label: "Windows-1252" },
                ],
            },
            {
                name: "fid",
                label: gettext("FID field"),
            },
            {
                name: "display_name",
                label: gettext("Use field display names instead of keynames"),
                widget: Checkbox,
            },
            {
                name: "fields",
                label: gettext("Fields"),
                widget: Select,
                mode: "multiple",
                included: !multiple,
                choices: fieldOptions,
            },
            {
                name: "extent",
                label: gettext("Limit by extent"),
                widget: ExtentInput,
            },
            {
                name: "ilike",
                label: gettext("Filter text"),
            },
            {
                name: "zipped",
                label: gettext("Zip archive"),
                widget: Checkbox,
                included: !multiple,
                disabled:
                    (exportFormat && !exportFormat.single_file) || multiple,
            },
        ];

        setFields(fieldsToSet);
    }, [srsOptions, fieldOptions, format, isReady, form, multiple, pick]);

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
            onChange={(e) => {
                if ("format" in e.value) {
                    setFormat(e.value.format);
                }
            }}
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
                    {gettext("Save")}
                </SaveButton>
            </Form.Item>
        </FieldsForm>
    );
}
