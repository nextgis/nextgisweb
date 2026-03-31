import type { TextSymbolizer as GSTextSymbolizer } from "geostyler-style";
import { cloneDeep as _cloneDeep } from "lodash-es";
import { useCallback, useMemo } from "react";

import { InputNumber, Select } from "@nextgisweb/gui/antd";
import type { OptionType } from "@nextgisweb/gui/antd";
import { FieldsForm } from "@nextgisweb/gui/fields-form";
import type { FormField } from "@nextgisweb/gui/fields-form";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { ColorInput } from "../../field/ColorInput";
import type { EditorProps } from "../../type";
import { extractColorAndOpacity } from "../../util/extractColorAndOpacity";

const msgLabel = gettext("Label size");
const msgColor = gettext("Label color");
const msgField = gettext("Label field");

type TextSymbolizer = GSTextSymbolizer & { field?: number };

type TextEditorProps = EditorProps<TextSymbolizer> & { fields: OptionType[] };

export function TextEditor({ value, onChange, fields }: TextEditorProps) {
  const onSymbolizer = useCallback(
    ({ value: v }: { value: TextSymbolizer }) => {
      if (onChange) {
        const symbolizerClone: TextSymbolizer = _cloneDeep({
          ...value,
          ...v,
        });

        if (typeof v.color === "string") {
          const [color, opacity] = extractColorAndOpacity(v.color);
          symbolizerClone.color = color;
          symbolizerClone.haloColor = color;
          symbolizerClone.opacity = opacity;
        }

        onChange(symbolizerClone);
      }
    },
    [onChange, value]
  );

  const formFields = useMemo<FormField<keyof TextSymbolizer>[]>(
    () => [
      {
        label: msgLabel,
        name: "size",
        formItem: <InputNumber min={0} />,
      },
      {
        label: msgColor,
        name: "color",
        formItem: <ColorInput />,
      },
      {
        label: msgField,
        name: "label",
        formItem: <Select options={fields} />,
      },
    ],
    [fields]
  );

  return (
    <FieldsForm
      fields={formFields}
      initialValues={value}
      onChange={onSymbolizer}
    />
  );
}
