import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import {
    Checkbox,
    FieldsForm,
    Form,
    Select,
    useForm,
} from "@nextgisweb/gui/fields-form";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import i18n from "@nextgisweb/pyramid/i18n!";
import settings from "@nextgisweb/pyramid/settings!feature_layer";
import { useEffect, useState } from "react";

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

export function ExportForm({ id }) {
    const [status, setStatus] = useState("loading");
    const { makeSignal } = useAbortController();
    const [srsOptions, setSrsOptions] = useState([]);
    const [fieldOptions, setFieldOptions] = useState([]);
    const [defaultSrs, setDefaultSrs] = useState();
    const [format, setFormat] = useState(exportFormats[0].name);
    const [fields, setFields] = useState([]);
    const [isReady, setIsReady] = useState(false);
    const form = useForm()[0];

    async function load() {
        try {
            const signal = makeSignal();
            const [srsInfo, itemInfo] = await Promise.all(
                [
                    route("spatial_ref_sys.collection"),
                    route("resource.item", id),
                ].map((r) => r.get({ signal }))
            );
            setSrsOptions(srsListToOptions(srsInfo));
            setDefaultSrs(itemInfo[itemInfo.resource.cls].srs.id);
            setFieldOptions(fieldListToOptions(itemInfo.feature_layer.fields));
        } catch (err) {
            errorModal(err);
        } finally {
            setStatus("loaded");
        }
    }

    useEffect(() => load(), []);

    useEffect(() => {
        const exportFormat = exportFormats.find((f) => f.name === format);
        const dscoCfg = (exportFormat && exportFormat.dsco_configurable) ?? [];
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
        if (isReady && Object.keys(dscoFieldsValues).length) {
            form.setFieldsValue(dscoFieldsValues);
        }
        setFields([
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
                choices: fieldOptions,
            },
            {
                name: "zipped",
                label: i18n.gettext("Zip archive"),
                widget: Checkbox,
                disabled: !exportFormat.single_file,
            },
        ]);
    }, [srsOptions, fieldOptions, format, isReady]);

    const onChange = (e) => {
        if ("format" in e.value) {
            setFormat(e.value.format);
        }
    };

    const exportFeatureLayer = () => {
        const fields = form.getFieldsValue();
        window.open(
            routeURL("resource.export", id) +
                "?" +
                new URLSearchParams(fields).toString()
        );
    };

    if (status === "loading") {
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
            initialValues={{
                format,
                fields: fieldOptions.map((field) => field.value),
                srs: defaultSrs,
                fid: "ngw_id",
                encoding: "UTF-8",
                display_name: false,
                zipped: true,
            }}
            labelCol={{ span: 6 }}
        >
            <Form.Item>
                <SaveButton onClick={exportFeatureLayer} icon={null}>
                    {i18n.gettext("Save")}
                </SaveButton>
            </Form.Item>
        </FieldsForm>
    );
}
