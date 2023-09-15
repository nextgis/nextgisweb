import _cloneDeep from "lodash-es/cloneDeep";
import { useMemo } from "react";

import { FieldsForm } from "@nextgisweb/gui/fields-form";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { ColorField } from "../../field/ColorField";
import { extractColorAndOpacity } from "../../util/extractColorAndOpacity";

import type { FormField } from "@nextgisweb/gui/fields-form";
import type { FillSymbolizer } from "geostyler-style";
import type { EditorProps } from "../../type";

const fillColorLabel = gettext("Fill color");
const outlineColorLabel = gettext("Stroke color");
const outlineWidthLabel = gettext("Stroke width");

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
                label: fillColorLabel,
                name: "color",
                widget: ColorField,
            },
            {
                label: outlineColorLabel,
                name: "outlineColor",
                widget: ColorField,
            },
            {
                label: outlineWidthLabel,
                name: "outlineWidth",
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
