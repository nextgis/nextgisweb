import { FieldsForm, Select } from "@nextgisweb/gui/fields-form";
import i18n from "@nextgisweb/pyramid/i18n!";
import { PropTypes } from "prop-types";
import { useMemo, useState, useEffect } from "react";

const PLACEHOLDERS = {
    epsg: "4326",
    mapinfo: "8, 1001, 7, 37.98333333333, 0, 1, 1300000, -4511057.628",
    proj4: "+proj=tmerc +lat_0=0 +lon_0=40.98333333333 +k=1 +x_0=1300000 +y_0=-4511057.63 +ellps=krass +towgs84=23.57,-140.95,-79.8,0,0.35,0.79,-0.22 +units=m +no_defs",
    esri: 'GEOGCS["GCS_WGS_1972", DATUM["D_WGS_1972", SPHEROID["WGS_1972", 6378135.0, 298.26]], PRIMEM["Greenwich", 0.0], UNIT["Degree", 0.0174532925199433]]',
};

export function SRSImportFrom({ format: f, projStr, onChange, form }) {
    const [format, setFormat] = useState(f);

    const fields = useMemo(
        () => [
            {
                name: "format",
                label: i18n.gettext("Format"),
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
                label: i18n.gettext("Definition"),
                widget: "textarea",
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
    }, [format]);

    return (
        <FieldsForm
            form={form}
            fields={fields}
            initialValues={{ format: format, projStr }}
            onChange={({ value }) => {
                if (value.format) {
                    setFormat(value.format);
                }
                if (onChange) {
                    onChange((old) => ({ ...old, ...value }));
                }
            }}
            labelCol={{ span: 6 }}
        ></FieldsForm>
    );
}

SRSImportFrom.propTypes = {
    format: PropTypes.oneOf(["epsg", "mapinfo", "proj4", "esri"]),
    projStr: PropTypes.string,
    onChange: PropTypes.func,
    form: PropTypes.any,
};
