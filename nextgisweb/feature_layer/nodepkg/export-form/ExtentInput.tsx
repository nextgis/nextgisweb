import { useEffect, useState } from "react";

import { Form, InputNumber, Space } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

const msgUnit = gettext("deg.");

const parts = [
    { key: "minx", label: gettext("Left"), min: -180, max: 180 },
    { key: "miny", label: gettext("Bottom"), min: -90, max: 90 },
    { key: "maxx", label: gettext("Right"), min: -180, max: 180 },
    { key: "maxy", label: gettext("Top"), min: -90, max: 90 },
];

type Extent = (null | number)[];

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
        <Space.Compact style={{ display: "flex", columnGap: "1em" }}>
            {parts.map(({ label, ...part }, idx) => (
                <InputNumber
                    {...part}
                    key={idx}
                    addonBefore={label}
                    addonAfter={msgUnit}
                    onChange={(value) =>
                        setValues((prev) => {
                            prev[idx] = value;
                            return prev;
                        })
                    }
                />
            ))}
        </Space.Compact>
    );
};

export function ExtentInput({ ...props }) {
    return (
        <Form.Item {...props}>
            <Widget />
        </Form.Item>
    );
}
