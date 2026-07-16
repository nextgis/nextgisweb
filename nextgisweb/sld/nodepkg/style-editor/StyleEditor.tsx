import type {
  Symbolizer as GSSymbolizer,
  TextSymbolizer,
} from "geostyler-style";
import { useEffect, useMemo, useState } from "react";

import { Checkbox, Space } from "@nextgisweb/gui/antd";
import type { OptionType } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { KindEditor } from "./component/KindEditor";
import { SymbolizerCard } from "./component/SymbolizerCard";
import { TextEditor } from "./component/editor/TextEditor";
import type { Symbolizer, SymbolizerType } from "./type/Style";
import { convertFromGeostyler } from "./util/convertFromGeostyler";
import { convertToGeostyler } from "./util/convertToGeostyler";
import {
  textSymbolizer as defTextSymbolizer,
  generateSymbolizer,
} from "./util/generateSymbolizer";

const msgLabel = gettext("Label");

export interface StyleEditorProps {
  value?: Symbolizer[];
  fields?: OptionType[];
  initType?: SymbolizerType;
  onChange?: (val: Symbolizer[]) => void;
}

export function StyleEditor({
  value,
  fields,
  initType = "point",
  onChange: onSymbolizerChange,
}: StyleEditorProps) {
  const [symbolizer] = useState<GSSymbolizer[]>(() =>
    value ? value.map(convertToGeostyler) : []
  );

  const [kindSymbolizer, setKindSymbolizer] = useState(() => {
    const kind = symbolizer.find(
      (s) => s.kind === "Fill" || s.kind === "Line" || s.kind === "Mark"
    );
    if (kind) {
      return kind;
    }
    return generateSymbolizer(initType);
  });
  const [textSymbolizerInit] = useState<TextSymbolizer | undefined>(() => {
    const kind = symbolizer.find((s) => s.kind === "Text");
    if (kind) {
      return kind;
    }
  });
  const [textSymbolizer, setTextSymbolizer] = useState<TextSymbolizer>(() => {
    return textSymbolizerInit || defTextSymbolizer;
  });

  // Fix text halo in GeoStyler preview.
  // No way to turn it off, so use text color as a workaround.
  const textSymbolizerForPreview = useMemo(() => {
    const textSymbolizerPreview: TextSymbolizer = { ...textSymbolizer };
    if (textSymbolizerPreview.haloColor === undefined) {
      textSymbolizerPreview.haloWidth = 0;
      textSymbolizerPreview.haloColor = textSymbolizer.color;
    }
    if (!textSymbolizerPreview.haloWidth) {
      textSymbolizerPreview.haloColor = textSymbolizer.color;
    }
    return textSymbolizerPreview;
  }, [textSymbolizer]);

  const [isLabel, setIsLabel] = useState(!!textSymbolizerInit);

  useEffect(() => {
    if (onSymbolizerChange) {
      const kind = convertFromGeostyler(kindSymbolizer);

      if (kind) {
        const style = [kind];
        if (isLabel) {
          const text = convertFromGeostyler(textSymbolizer);
          if (text) {
            style.push(text);
          }
        }
        onSymbolizerChange(style);
      }
    }
  }, [kindSymbolizer, isLabel, textSymbolizer, onSymbolizerChange]);

  return (
    <>
      {kindSymbolizer && <SymbolizerCard symbolizer={[kindSymbolizer]} />}
      <div className="ngw-sld-style-editor">
        <Space orientation="vertical" style={{ width: "100%" }}>
          <KindEditor
            symbolizer={kindSymbolizer}
            setSymbolizer={setKindSymbolizer}
          />
        </Space>
        {fields && (
          <Space>
            <Checkbox
              checked={isLabel}
              onChange={(e) => setIsLabel(e.target.checked)}
            />
            {msgLabel}
          </Space>
        )}
      </div>

      {isLabel && fields && (
        <>
          {textSymbolizer && (
            <SymbolizerCard symbolizer={[textSymbolizerForPreview]} />
          )}
          <div className="ngw-sld-style-editor">
            <TextEditor
              value={textSymbolizer}
              onChange={setTextSymbolizer}
              fields={fields}
            />
          </div>
        </>
      )}
    </>
  );
}
