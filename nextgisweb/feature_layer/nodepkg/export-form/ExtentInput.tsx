import { useState, useEffect } from "react";
import { Form, Input, InputNumber } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n";

const unit = i18n.gettext("deg.");
const parts = [
    { key: "minx", label: i18n.gettext("Left"), min: -180, max: 180 },
    { key: "miny", label: i18n.gettext("Bottom"), min: -90, max: 90 },
    { key: "maxx", label: i18n.gettext("Right"), min: -180, max: 180 },
    { key: "maxy", label: i18n.gettext("Top"), min: -90, max: 90 },
];

type Extent = (null | number)[]

interface ExtentInputProps {
    value?: Extent;
    onChange?: (val: Extent) => void;
}

const Widget = ({ value, onChange }: ExtentInputProps) => {
    const [values, setValues] = useState(value ? value : parts.map(() => null));
    useEffect(() => {
        if (onChange) {
            onChange(values);
        }
    }, [values, onChange]);

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

export function ExtentInput({ ...props }) {
    return (
        <Form.Item {...props}>
            <Widget />
        </Form.Item>
    );
}
