import _cloneDeep from "lodash-es/cloneDeep";
import { useMemo } from "react";

import { FieldsForm } from "@nextgisweb/gui/fields-form";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { ColorField } from "../../field/ColorField";
import { wellKnownNames } from "../../util/constant";
import { extractColorAndOpacity } from "../../util/extractColorAndOpacity";

import type { FormField } from "@nextgisweb/gui/fields-form";
import type { MarkSymbolizer } from "geostyler-style";
import type { EditorProps } from "../../type";

const radiusLabel = gettext("Size");
const fillColorLabel = gettext("Fill color");
const strokeColorLabel = gettext("Stroke color");
const strokeWidthLabel = gettext("Stroke width");

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
            if (typeof v.radius === "number") {
                symbolizerClone.radius = v.radius / 2;
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
                label: radiusLabel,
                name: "wellKnownName",
                widget: "select",
                choices: wellKnownNames,
            },
            {
                label: radiusLabel,
                name: "radius",
                widget: "number",
                inputProps: {
                    min: 0,
                },
            },
            {
                label: fillColorLabel,
                name: "color",
                widget: ColorField,
            },
            {
                label: strokeColorLabel,
                name: "strokeColor",
                widget: ColorField,
            },
            {
                label: strokeWidthLabel,
                name: "strokeWidth",
                widget: "number",
                inputProps: {
                    min: 0,
                },
            },
        ],
        []
    );

    const initialValue = {
        ...value,
        radius:
            typeof value.radius === "number" ? value.radius * 2 : value.radius,
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
