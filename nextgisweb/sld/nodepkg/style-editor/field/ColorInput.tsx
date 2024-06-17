import { useEffect, useState } from "react";

import { ColorPicker } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { extractColorAndOpacity } from "../util/extractColorAndOpacity";

import "./ColorInput.less";

export interface ColorInputProps {
    transparentInsteadEmpty?: boolean;
    defaultValue?: string;
    disabledAlpha?: boolean;
    value?: string;
    onChange?: (color?: string) => void;
}

const msgNone = gettext("None");
const msgTransparent = gettext("Transparent");

export function ColorInput({
    onChange,
    value,
    disabledAlpha,
    transparentInsteadEmpty,
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

    const handleSetTransparent = () => {
        let transparentColor = color || "#00000000";

        transparentColor = transparentColor.replace(
            /^(#[0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/,
            "$100"
        );
        setColor(transparentColor);
        setClear(false);
        if (onChange) {
            if (transparentInsteadEmpty) {
                onChange(transparentColor);
            } else {
                onChange(undefined);
            }
        }
    };

    return (
        <>
            <ColorPicker
                value={color || null}
                disabledAlpha={disabledAlpha}
                onClear={() => setClear(true)}
                onChangeComplete={(newColor) => {
                    let hex = newColor.toHexString();
                    if (
                        clear ||
                        (color &&
                            /^(#[0-9a-f]{6})00$/i.test(color) &&
                            /^(#[0-9a-f]{6})00$/i.test(hex))
                    ) {
                        hex = hex.replace(/^(#[0-9a-f]{6})00$/i, "$1FF");
                    }
                    setClear(false);
                    setColor(hex);
                    if (onChange) {
                        if (transparentInsteadEmpty) {
                            onChange(hex);
                        } else {
                            onChange(
                                /^(#[0-9a-f]{6})00$/i.test(hex)
                                    ? undefined
                                    : hex
                            );
                        }
                    }
                }}
                showText={(val) => colorLabel(val.toHexString())}
                allowClear={!transparentInsteadEmpty}
                panelRender={(panel) => (
                    <>
                        {transparentInsteadEmpty && (
                            <div
                                className="color-input__set-transparent"
                                onClick={handleSetTransparent}
                            >
                                <div className="color-input__set-transparent-icon"></div>
                                <span className="color-input__set-transparent-text">
                                    {msgTransparent}
                                </span>
                            </div>
                        )}
                        {panel}
                    </>
                )}
            />
        </>
    );
}
