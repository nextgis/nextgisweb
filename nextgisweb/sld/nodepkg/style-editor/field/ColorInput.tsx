import { useEffect, useState } from "react";

import { ColorPicker } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { extractColorAndOpacity } from "../util/extractColorAndOpacity";

export interface ColorInputProps {
    value?: string;
    onChange?: (color?: string) => void;
    defaultValue?: string;
    disabledAlpha?: boolean;
}

const msgNone = gettext("None");

export function ColorInput({
    onChange,
    value,
    disabledAlpha,
}: ColorInputProps) {
    const [color, setColor] = useState(value);
    const [clear, setClear] = useState(!value);

    useEffect(() => {
        setColor(value);
    }, [value]);

    const colorLabel = (colorHex: string) => {
        const [color, opacity] = extractColorAndOpacity(colorHex);
        if (opacity === 0) {
            return msgNone;
        } else {
            return (
                color + (!disabledAlpha ? ` ${Math.floor(opacity * 100)}%` : "")
            );
        }
    };

    return (
        <ColorPicker
            value={color || null}
            disabledAlpha={disabledAlpha}
            onClear={() => setClear(true)}
            onChangeComplete={(newColor) => {
                let hex = newColor.toHexString();
                if (clear) hex = hex.replace(/^(#[0-9a-f]{6})00$/i, "$1FF");
                setClear(false);
                setColor(hex);
                if (onChange) {
                    onChange(/^(#[0-9a-f]{6})00$/i.test(hex) ? undefined : hex);
                }
            }}
            showText={(val) => colorLabel(val.toHexString())}
            allowClear
        />
    );
}
