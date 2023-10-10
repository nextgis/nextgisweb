import type { MarkSymbolizer as GSMarkSymbolizer } from "geostyler-style";
import _cloneDeep from "lodash-es/cloneDeep";
import { useMemo } from "react";

import { FieldsForm } from "@nextgisweb/gui/fields-form";
import type { FormField } from "@nextgisweb/gui/fields-form";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { ColorField } from "../../field/ColorField";
import type { EditorProps } from "../../type";
import { wellKnownNames } from "../../util/constant";
import { extractColorAndOpacity } from "../../util/extractColorAndOpacity";
import { hexWithOpacity } from "../../util/hexWithOpacity";

type MarkSymbolizer = GSMarkSymbolizer & { size?: number };

const msgShape = gettext("Shape");
const msgSize = gettext("Size");
const msgFillColor = gettext("Fill color");
const msgStrokeColor = gettext("Stroke color");
const msgStrokeWidth = gettext("Stroke width");

export function MarkEditor({ value, onChange }: EditorProps<MarkSymbolizer>) {
    const onSymbolizer = (v: MarkSymbolizer) => {
        if (onChange) {
            const symbolizerClone: MarkSymbolizer = _cloneDeep({
                ...value,
                ...v,
            });

            if (typeof v.color === "string") {
                const [color, opacity] = extractColorAndOpacity(v.color);
                symbolizerClone.color = color;
                symbolizerClone.opacity = opacity;
                symbolizerClone.fillOpacity = opacity;
            }
            if (typeof v.size === "number") {
                symbolizerClone.radius = v.size / 2;
            }
            if (typeof v.strokeColor === "string") {
                const [strokeColor, strokeOpacity] = extractColorAndOpacity(
                    v.strokeColor
                );
                symbolizerClone.strokeColor = strokeColor;
                symbolizerClone.strokeOpacity = strokeOpacity;
            }

            onChange(symbolizerClone);
        }
    };

    const fields = useMemo<FormField<keyof MarkSymbolizer>[]>(
        () => [
            {
                label: msgShape,
                name: "wellKnownName",
                widget: "select",
                choices: wellKnownNames,
            },
            {
                label: msgSize,
                name: "size",
                widget: "number",
                inputProps: {
                    min: 0,
                },
            },
            {
                label: msgFillColor,
                name: "color",
                widget: ColorField,
            },
            {
                label: msgStrokeColor,
                name: "strokeColor",
                widget: ColorField,
            },
            {
                label: msgStrokeWidth,
                name: "strokeWidth",
                widget: "number",
                inputProps: {
                    min: 0,
                },
            },
        ],
        []
    );

    const { color, opacity, fillOpacity, strokeColor, strokeOpacity } = value;

    const initialValue: MarkSymbolizer = {
        ...value,
        color: hexWithOpacity(color, opacity || fillOpacity),
        strokeColor: hexWithOpacity(strokeColor, strokeOpacity),
        size:
            typeof value.radius === "number"
                ? value.radius * 2
                : Number(value.radius),
    };

    return (
        <FieldsForm
            fields={fields}
            initialValues={initialValue}
            onChange={({ value: v }) => {
                onSymbolizer(v as MarkSymbolizer);
            }}
        />
    );
}
