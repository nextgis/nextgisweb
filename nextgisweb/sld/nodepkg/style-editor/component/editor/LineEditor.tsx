import _cloneDeep from "lodash-es/cloneDeep";
import { useMemo } from "react";

import { FieldsForm } from "@nextgisweb/gui/fields-form";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { ColorField } from "../../field/ColorField";
import { extractColorAndOpacity } from "../../util/extractColorAndOpacity";

import type { FormField } from "@nextgisweb/gui/fields-form";
import type { LineSymbolizer } from "geostyler-style";
import type { EditorProps } from "../../type";

const fillColorLabel = gettext("Fill color");
const widthLabel = gettext("Width");

export function LineEditor({ value, onChange }: EditorProps<LineSymbolizer>) {
    const onSymbolizer = (v: LineSymbolizer) => {
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
    };

    const fields = useMemo<FormField<keyof LineSymbolizer>[]>(
        () => [
            {
                label: fillColorLabel,
                name: "color",
                widget: ColorField,
            },
            {
                label: widthLabel,
                name: "width",
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
                onSymbolizer(v as LineSymbolizer);
            }}
        />
    );
}
