import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { Form, Input, InputNumber } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n!feature_layer";

const unit = i18n.gettext("deg.");
const parts = [
    { key: "minx", label: i18n.gettext("Left"), min: -180, max: 180 },
    { key: "miny", label: i18n.gettext("Bottom"), min: -90, max: 90 },
    { key: "maxx", label: i18n.gettext("Right"), min: -180, max: 180 },
    { key: "maxy", label: i18n.gettext("Top"), min: -90, max: 90 },
];

const Widget = ({ value, onChange }) => {
    const [values, setValues] = useState(value ? value : parts.map(() => null));
    useEffect(() => onChange(values), [values, onChange]);

    return (
        <Input.Group style={{ display: "flex", columnGap: "1em" }}>
            {parts.map(({ label, ...part }, idx) => (
                <InputNumber
                    {...part}
                    key={idx}
                    addonBefore={label}
                    addonAfter={unit}
                    onChange={(value) =>
                        setValues((prev) => {
                            prev[idx] = value;
                            return prev;
                        })
                    }
                />
            ))}
        </Input.Group>
    );
};

Widget.propTypes = {
    onChange: PropTypes.func,
    value: PropTypes.any,
};

export function ExtentInput({ ...props }) {
    return (
        <Form.Item {...props}>
            <Widget />
        </Form.Item>
    );
}
