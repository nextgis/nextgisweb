import type { TextSymbolizer as GSTextSymbolizer } from "geostyler-style";
import { cloneDeep as _cloneDeep } from "lodash-es";
import { useCallback, useMemo } from "react";

import { InputNumber, Select, Space } from "@nextgisweb/gui/antd";
import type { InputNumberProps, OptionType } from "@nextgisweb/gui/antd";
import { FieldsForm } from "@nextgisweb/gui/fields-form";
import type { FormField } from "@nextgisweb/gui/fields-form";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { ColorInput } from "../../field/ColorInput";
import type { EditorProps } from "../../type";
import { extractColorAndOpacity } from "../../util/extractColorAndOpacity";

const msgLabel = gettext("Label size");
const msgColor = gettext("Label color");
const msgField = gettext("Label field");
const msgOffset = gettext("Offset");
const msgHaloSize = gettext("Text buffer size");
const msgHaloColor = gettext("Text buffer color");

type TextSymbolizer = GSTextSymbolizer & { field?: number };
type Offset = [number, number];

type TextEditorProps = EditorProps<TextSymbolizer> & { fields: OptionType[] };

const normalizeOffset = (
  x: number | undefined,
  y: number | undefined
): Offset | undefined => {
  if (x === undefined && y === undefined) {
    return undefined;
  }

  return [x ?? 0, y ?? 0];
};

const offsetInputProps: InputNumberProps<number> = {
  styles: { prefix: { marginInlineEnd: "var(--ant-padding-xs)" } },
  placeholder: "0",
};

function OffsetInput({
  value,
  onChange,
}: {
  value?: Offset;
  onChange?: (value?: Offset) => void;
}) {
  const [x, y] = value || [];

  const changeX = (newValue: number | null) => {
    onChange?.(normalizeOffset(newValue ?? undefined, y));
  };

  const changeY = (newValue: number | null) => {
    onChange?.(normalizeOffset(x, newValue ?? undefined));
  };

  return (
    <Space.Compact block>
      <InputNumber<number>
        {...offsetInputProps}
        prefix="X"
        value={x}
        onChange={changeX}
      />
      <InputNumber<number>
        {...offsetInputProps}
        prefix="Y"
        value={y}
        onChange={changeY}
      />
    </Space.Compact>
  );
}

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
        if (typeof v.haloColor === "string") {
          const [haloColor] = extractColorAndOpacity(v.haloColor);
          symbolizerClone.haloColor = haloColor;
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
      {
        label: msgOffset,
        name: "offset",
        formItem: <OffsetInput />,
      },
      {
        label: msgHaloSize,
        name: "haloWidth",
        formItem: <InputNumber min={0} />,
      },
      {
        label: msgHaloColor,
        name: "haloColor",
        formItem: <ColorInput disabledAlpha />,
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
