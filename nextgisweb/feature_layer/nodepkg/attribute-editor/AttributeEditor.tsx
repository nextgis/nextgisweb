import { observer } from "mobx-react-lite";
import { useState } from "react";

import type { EditorWidgetProps } from "@nextgisweb/feature-layer/feature-editor/type";
import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import type { SizeType } from "@nextgisweb/gui/fields-form";

import { AttributeEditorFields } from "./AttributeEditorFields";
import AttributeEditorStore from "./AttributeEditorStore";
import type { NgwAttributeValue } from "./type";

import "./AttributeEditor.less";

type AttributeEditorProps = EditorWidgetProps<
  AttributeEditorStore,
  {
    fields?: FeatureLayerFieldRead[];
    size?: SizeType;
    onChange?: (value: NgwAttributeValue | null) => void;
  }
>;

const AttributeEditor = observer(
  ({
    store: store_,
    fields,
    size = "middle",
    onChange,
  }: AttributeEditorProps) => {
    const [store] = useState(
      () => store_ ?? new AttributeEditorStore({ fields })
    );

    return (
      <AttributeEditorFields store={store} size={size} onChange={onChange} />
    );
  }
);

AttributeEditor.displayName = "AttributeEditor";

export default AttributeEditor;
