import type { FillSymbolizer } from "geostyler-style";
import { cloneDeep as _cloneDeep } from "lodash-es";
import { useMemo } from "react";

import { InputNumber } from "@nextgisweb/gui/antd";
import { FieldsForm } from "@nextgisweb/gui/fields-form";
import type { FormField } from "@nextgisweb/gui/fields-form";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { ColorInput } from "../../field/ColorInput";
import type { EditorProps } from "../../type";
import { extractColorAndOpacity } from "../../util/extractColorAndOpacity";
import { hexWithOpacity } from "../../util/hexWithOpacity";

const msgFillColor = gettext("Fill color");
const msgOutlineColor = gettext("Stroke color");
const msgOutlineWidth = gettext("Stroke width");

export function FillEditor({ value, onChange }: EditorProps<FillSymbolizer>) {
    const onSymbolizer = (v: FillSymbolizer) => {
        if (onChange) {
            const symbolizerClone: FillSymbolizer = _cloneDeep({
                ...value,
                ...v,
            });

            if (typeof v.color === "string") {
                const [color, opacity] = extractColorAndOpacity(v.color);
                symbolizerClone.color = color;
                symbolizerClone.opacity = opacity;
                symbolizerClone.fillOpacity = opacity;
            }
            if (typeof v.outlineColor === "string") {
                const [strokeColor, strokeOpacity] = extractColorAndOpacity(
                    v.outlineColor
                );
                symbolizerClone.outlineColor = strokeColor;
                symbolizerClone.outlineOpacity = strokeOpacity;
            }

            onChange(symbolizerClone);
        }
    };

    const fields = useMemo<FormField<keyof FillSymbolizer>[]>(
        () => [
            {
                label: msgFillColor,
                name: "color",
                formItem: <ColorInput />,
            },
            {
                label: msgOutlineColor,
                name: "outlineColor",
                formItem: <ColorInput />,
            },
            {
                label: msgOutlineWidth,
                name: "outlineWidth",
                formItem: <InputNumber min={0} />,
            },
        ],
        []
    );

    const { color, opacity, fillOpacity, outlineColor, outlineOpacity } = value;

    const initialValue: FillSymbolizer = {
        ...value,
        color: hexWithOpacity(color, opacity || fillOpacity),
        outlineColor: hexWithOpacity(outlineColor, outlineOpacity),
    };

    return (
        <FieldsForm
            fields={fields}
            initialValues={initialValue}
            onChange={({ value: v }) => {
                onSymbolizer(v as FillSymbolizer);
            }}
        />
    );
}
