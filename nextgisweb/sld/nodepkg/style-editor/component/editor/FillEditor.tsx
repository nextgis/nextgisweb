import type { FillSymbolizer } from "geostyler-style";
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
const msgStrokeColor = gettext("Stroke color");
const msgStrokeWidth = gettext("Stroke width");
const msgStrokeStyle = gettext("Stroke style");

export function FillEditor({ value, onChange }: EditorProps<FillSymbolizer>) {
    const [outlineWidth, setOutlineWidth] = useState<number | undefined>(
        value.outlineWidth as number
    );

    const onSymbolizer = useCallback(
        ({ value: v }: { value: FillSymbolizer }) => {
            if (typeof v.outlineWidth === "number") {
                setOutlineWidth(v.outlineWidth);
            }

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
        },
        [onChange, value]
    );

    const fields = useMemo<FormField<keyof FillSymbolizer>[]>(
        () => [
            {
                label: msgFillColor,
                name: "color",
                formItem: <ColorInput />,
            },
            {
                label: msgStrokeColor,
                name: "outlineColor",
                formItem: <ColorInput />,
            },
            {
                label: msgStrokeWidth,
                name: "outlineWidth",
                formItem: <InputNumber min={0} />,
            },
            {
                label: msgStrokeStyle,
                name: "outlineDasharray",
                formItem: (
                    <DashPatternInput lineWidth={outlineWidth as number} />
                ),
            },
        ],
        [outlineWidth]
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
            onChange={onSymbolizer}
        />
    );
}
