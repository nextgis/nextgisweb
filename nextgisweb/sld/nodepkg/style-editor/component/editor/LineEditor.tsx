import type { LineSymbolizer } from "geostyler-style";
import _cloneDeep from "lodash-es/cloneDeep";
import { useMemo } from "react";

import { FieldsForm } from "@nextgisweb/gui/fields-form";
import type { FormField } from "@nextgisweb/gui/fields-form";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { ColorField } from "../../field/ColorField";
import type { EditorProps } from "../../type";
import { extractColorAndOpacity } from "../../util/extractColorAndOpacity";
import { hexWithOpacity } from "../../util/hexWithOpacity";

const msgFillColor = gettext("Fill color");
const msgWidth = gettext("Width");

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
                label: msgFillColor,
                name: "color",
                widget: ColorField,
            },
            {
                label: msgWidth,
                name: "width",
                widget: "number",
                inputProps: {
                    min: 0,
                },
            },
        ],
        []
    );

    const { color, opacity } = value;
    const initialValue: LineSymbolizer = {
        ...value,
        color: hexWithOpacity(color, opacity),
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
