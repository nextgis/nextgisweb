import { useCallback, useEffect, useMemo, useState } from "react";

import { Select } from "@nextgisweb/gui/antd";
import type { OptionType } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import { FieldsForm, Form } from "@nextgisweb/gui/fields-form";
import type { FormField } from "@nextgisweb/gui/fields-form";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!raster_layer";
import type { CompositeRead } from "@nextgisweb/resource/type/api";
import type { SRSRead } from "@nextgisweb/spatial-ref-sys/type/api";

type RasterLayerRead = CompositeRead["raster_layer"];

interface ExporFormValues {
    format: string;
    srs: string;
    bands: string[];
}

const srsListToOptions = (srsList: SRSRead[]): OptionType[] => {
    return srsList.map((srs) => {
        return {
            label: srs.display_name,
            value: srs.id,
        };
    });
};

const bandListToOptions = (
    bandList: RasterLayerRead["color_interpretation"]
) => {
    return bandList.map((band: string, idx: number) => {
        return {
            label:
                gettext("Band") +
                " " +
                (idx + 1) +
                (band !== "Undefined" ? " (" + band + ")" : ""),
            value: idx + 1,
        };
    });
};

export function ExportForm({ id }: { id: number }) {
    const [status, setStatus] = useState("loading");
    const { makeSignal, abort } = useAbortController();
    const [srsOptions, setSrsOptions] = useState<OptionType[]>([]);
    const [bandOptions, setBandOptions] = useState<OptionType[]>([]);
    const [defaultSrs, setDefaultSrs] = useState();
    const form = Form.useForm<ExporFormValues>()[0];

    const load = useCallback(async () => {
        abort();
        try {
            const signal = makeSignal();
            const srsInfo = await route("spatial_ref_sys.collection").get({
                signal,
            });
            const itemInfo = await route("resource.item", id).get({ signal });

            setSrsOptions(srsListToOptions(srsInfo));
            setBandOptions(
                bandListToOptions(itemInfo.raster_layer.color_interpretation)
            );
            setDefaultSrs(itemInfo.raster_layer.srs.id);
        } catch (err) {
            errorModal(err as ApiError);
        } finally {
            setStatus("loaded");
        }
    }, [id, makeSignal, abort]);

    useEffect(() => {
        load();
    }, [load]);

    const fields = useMemo<FormField<keyof ExporFormValues>[]>(
        () => [
            {
                name: "format",
                label: gettext("Format"),
                formItem: (
                    <Select
                        options={settings.export_formats.map((format) => ({
                            value: format.name,
                            label: format.display_name,
                        }))}
                    />
                ),
            },
            {
                name: "srs",
                label: gettext("SRS"),
                formItem: <Select options={srsOptions} />,
            },
            {
                name: "bands",
                label: gettext("Bands"),
                formItem: <Select mode="multiple" options={bandOptions} />,
            },
        ],
        [srsOptions, bandOptions]
    );

    const exportRaster = () => {
        const fields = form.getFieldsValue();
        window.open(
            routeURL("resource.export", id) +
                "?" +
                new URLSearchParams(Object.entries(fields)).toString()
        );
    };

    if (status === "loading") {
        return <LoadingWrapper />;
    }

    return (
        <FieldsForm
            fields={fields}
            form={form}
            initialValues={{
                srs: defaultSrs,
                bands: bandOptions.map((band) => band.value),
                format: settings.export_formats[0].name,
            }}
            labelCol={{ span: 6 }}
        >
            <Form.Item>
                <SaveButton onClick={exportRaster} icon={null}>
                    {gettext("Save")}
                </SaveButton>
            </Form.Item>
        </FieldsForm>
    );
}
