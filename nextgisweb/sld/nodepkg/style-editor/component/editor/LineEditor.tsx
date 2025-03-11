import type { LineSymbolizer } from "geostyler-style";
import { cloneDeep as _cloneDeep } from "lodash-es";
import { useCallback, useMemo, useState } from "react";

import { InputNumber } from "@nextgisweb/gui/antd";
import { FieldsForm } from "@nextgisweb/gui/fields-form";
import type { FormField } from "@nextgisweb/gui/fields-form";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { ColorInput } from "../../field/ColorInput";
import { DashPatternInput } from "../../field/DashInput";
import type { EditorProps } from "../../type";
import { extractColorAndOpacity } from "../../util/extractColorAndOpacity";
import { hexWithOpacity } from "../../util/hexWithOpacity";

const msgFillColor = gettext("Fill color");
const msgWidth = gettext("Width");
const msgStyle = gettext("Style");

export function LineEditor({ value, onChange }: EditorProps<LineSymbolizer>) {
    const [width, setWidth] = useState<number | undefined>(
        value.width as number
    );

    const onSymbolizer = useCallback(
        (v: LineSymbolizer) => {
            if (onChange) {
                const symbolizerClone: LineSymbolizer = _cloneDeep({
                    ...value,
                    ...v,
                });

                if (typeof v.color === "string") {
                    const [color, opacity] = extractColorAndOpacity(v.color);
                    symbolizerClone.color = color;
                    symbolizerClone.opacity = opacity;
                }

                onChange(symbolizerClone);
            }
        },
        [onChange, value]
    );

    const fields = useMemo<FormField<keyof LineSymbolizer>[]>(
        () => [
            {
                label: msgFillColor,
                name: "color",
                formItem: <ColorInput />,
            },
            {
                label: msgWidth,
                name: "width",
                formItem: <InputNumber min={0} />,
            },
            {
                label: msgStyle,
                name: "dasharray",
                formItem: <DashPatternInput lineWidth={width as number} />,
            },
        ],
        [width]
    );

    const { color, opacity } = value;
    const initialValue: LineSymbolizer = {
        ...value,
        color: hexWithOpacity(color, opacity),
    };

    const onChangeCallback = useCallback(
        ({ value: v }) => {
            onSymbolizer(v as LineSymbolizer);
            if (v.width !== undefined) {
                setWidth(v.width as number);
            }
        },
        [onSymbolizer]
    );

    return (
        <FieldsForm
            fields={fields}
            initialValues={initialValue}
            onChange={onChangeCallback}
        />
    );
}
