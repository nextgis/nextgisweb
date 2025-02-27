import { useCallback, useEffect, useMemo, useState } from "react";

import settings from "@nextgisweb/feature-layer/client-settings";
import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import { Checkbox, Input, Select } from "@nextgisweb/gui/antd";
import {
    ExtentRow,
    LoadingWrapper,
    SaveButton,
} from "@nextgisweb/gui/component";
import type { ExtentRowProps } from "@nextgisweb/gui/component/extent-row/ExtentRow";
import { errorModal } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import { FieldsForm, Form } from "@nextgisweb/gui/fields-form";
import type { FormField } from "@nextgisweb/gui/fields-form";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ResourceSelectMultiple } from "@nextgisweb/resource/component";
import type { SRSRead } from "@nextgisweb/spatial-ref-sys/type/api";

import { useExportFeatureLayer } from "../hook/useExportFeatureLayer";
import type { ExportFeatureLayerOptions } from "../hook/useExportFeatureLayer";

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

interface FormProps extends ExportFeatureLayerOptions {
    [key: string]: unknown;
    format: string;
    fields: string[];
    srs: number | undefined;
    fid: string;
    encoding: string;
    display_name: boolean;
    zipped: boolean;
    extent: (null | number)[];
    ilike: string;
}

type FormPropsKey = Extract<keyof FormProps, string>;

const exportFormats = settings.export_formats;

const srsListToOptions = (srsList: SRSRead[]): SrsOption[] =>
    srsList.map((srs) => ({
        label: srs.display_name,
        value: srs.id,
    }));

const fieldListToOptions = (fieldList: FeatureLayerFieldRead[]) => {
    return fieldList.map((field) => {
        return {
            label: field.display_name,
            value: field.keyname,
        };
    });
};

function ExtentInput({
    value,
    onChange,
}: {
    value?: (null | number)[];
    onChange?: (val: (null | number)[]) => void;
} & ExtentRowProps) {
    const [left, bottom, right, top] = value || [];
    return (
        <ExtentRow
            value={{ left, top, right, bottom }}
            onChange={({ left, top, right, bottom }) => {
                if (onChange) {
                    onChange(
                        [left, bottom, right, top].map((v) =>
                            v !== undefined ? v : null
                        )
                    );
                }
            }}
        />
    );
}

export function ExportForm({ id, pick, multiple }: ExportFormProps) {
    const [staffLoading, setStaffLoading] = useState(true);

    const [urlParams, setUrlParams] = useState({});

    const { exportFeatureLayer, exportLoading } = useExportFeatureLayer({ id });
    const { makeSignal } = useAbortController();
    const [srsOptions, setSrsOptions] = useState<SrsOption[]>([]);
    const [fieldOptions, setFieldOptions] = useState<FieldOption[]>([]);
    const [defaultSrs, setDefaultSrs] = useState<number>();
    const [format, setFormat] = useState(exportFormats[0].name);
    const [fields, setFields] = useState<FormField<FormPropsKey>[]>([]);
    const [isReady, setIsReady] = useState(false);
    const form = Form.useForm<FormProps>()[0];

    const loading = staffLoading || exportLoading;

    const initialValues = useMemo(() => {
        const initialVals: Partial<FormProps> = {
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

            if (id !== undefined) {
                const itemInfo = await route("resource.item", id).get({
                    signal,
                });

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
        let multipleFields: FormField<FormPropsKey>[] = [];
        const dscoFields: FormField<FormPropsKey>[] = [];
        const dscoFieldsValues: Record<string, string> = {};
        for (const d of dscoCfg) {
            const [name, value] = d.split(":");
            dscoFields.push({
                name,
                formItem: <Input />,
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
                    formItem: (
                        <ResourceSelectMultiple
                            pickerOptions={{
                                traverseClasses: ["resource_group"],
                                requireClass: "vector_layer",
                                requireInterface: "IFeatureLayer",
                                hideUnavailable: true,
                            }}
                        />
                    ),
                },
            ];
        }
        if (isReady && Object.keys(dscoFieldsValues).length) {
            form.setFieldsValue(dscoFieldsValues);
        }

        const fieldsToSet: FormField<FormPropsKey>[] = [
            ...multipleFields,
            {
                name: "format",
                label: gettext("Format"),
                formItem: (
                    <Select
                        options={exportFormats.map((format) => ({
                            value: format.name,
                            label: format.display_name,
                        }))}
                    />
                ),
            },
            ...dscoFields,
            {
                name: "srs",
                label: gettext("SRS"),
                formItem: <Select options={srsOptions} />,
            },
            {
                name: "encoding",
                label: gettext("Encoding"),
                formItem: (
                    <Select
                        options={[
                            { value: "UTF-8", label: "UTF-8" },
                            { value: "CP1251", label: "Windows-1251" },
                            { value: "CP1252", label: "Windows-1252" },
                        ]}
                    />
                ),
            },
            {
                name: "fid",
                formItem: <Input />,
                label: gettext("FID field"),
            },
            {
                name: "display_name",
                label: gettext("Use field display names instead of keynames"),
                valuePropName: "checked",
                formItem: <Checkbox />,
            },
            {
                name: "fields",
                label: gettext("Fields"),
                formItem: <Select mode="multiple" options={fieldOptions} />,
                included: !multiple,
            },
            {
                name: "extent",
                label: gettext("Limit by extent"),
                formItem: <ExtentInput />,
            },
            {
                name: "ilike",
                formItem: <Input />,
                label: gettext("Filter text"),
            },
            {
                name: "zipped",
                label: gettext("Zip archive"),
                formItem: (
                    <Checkbox
                        disabled={
                            (exportFormat && !exportFormat.single_file) ||
                            multiple
                        }
                    />
                ),
                valuePropName: "checked",
                included: !multiple,
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
