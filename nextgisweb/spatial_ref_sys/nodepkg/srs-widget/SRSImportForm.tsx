import { useEffect, useMemo, useState } from "react";

import { FieldsForm, Select } from "@nextgisweb/gui/fields-form";
import type { FieldsFormProps, FormField } from "@nextgisweb/gui/fields-form";
import { gettext } from "@nextgisweb/pyramid/i18n";

const PLACEHOLDERS = {
    epsg: "4326",
    mapinfo: "8, 1001, 7, 37.98333333333, 0, 1, 1300000, -4511057.628",
    proj4: "+proj=tmerc +lat_0=0 +lon_0=40.98333333333 +k=1 +x_0=1300000 +y_0=-4511057.63 +ellps=krass +towgs84=23.57,-140.95,-79.8,0,0.35,0.79,-0.22 +units=m +no_defs",
    esri: 'GEOGCS["GCS_WGS_1972", DATUM["D_WGS_1972", SPHEROID["WGS_1972", 6378135.0, 298.26]], PRIMEM["Greenwich", 0.0], UNIT["Degree", 0.0174532925199433]]',
};

type Format = keyof typeof PLACEHOLDERS;

interface SrsFormValue {
    format: Format;
    projStr: string;
}

interface SRSImportFromProps
    extends Omit<FieldsFormProps, "fields" | "onChange"> {
    format: string;
    projStr: string;
    form: NonNullable<FieldsFormProps["form"]>;
    onChange?: (arg: (val: SrsFormValue) => SrsFormValue) => void;
}

export function SRSImportFrom({
    format: f,
    projStr,
    onChange,
    form,
    ...restProps
}: SRSImportFromProps) {
    const [format, setFormat] = useState<Format>(f as Format);

    const fields = useMemo<FormField[]>(
        () => [
            {
                name: "format",
                label: gettext("Format"),
                widget: Select,
                choices: [
                    { value: "proj4", label: "PROJ" },
                    { value: "mapinfo", label: "MapInfo" },
                    { value: "epsg", label: "EPSG" },
                    { value: "esri", label: "ESRI WKT" },
                ],
            },
            {
                name: "projStr",
                label: gettext("Definition"),
                widget: "text",
                placeholder: PLACEHOLDERS[format],
                required: true,
                rows: 4,
            },
        ],
        [format]
    );

    useEffect(() => {
        form.setFields([
            {
                name: "projStr",
                errors: [],
            },
        ]);
    }, [form, format]);

    return (
        <FieldsForm
            form={form}
            fields={fields}
            initialValues={{ format: format, projStr }}
            onChange={({ value }) => {
                const val = value as SrsFormValue;
                if (val.format) {
                    setFormat(value.format);
                }
                if (onChange) {
                    onChange((old: SrsFormValue) => ({ ...old, ...val }));
                }
            }}
            labelCol={{ span: 6 }}
            {...restProps}
        ></FieldsForm>
    );
}
