import { useMemo } from "react";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";

import { FeatureFilterEditor } from "./FeatureFilterEditor";
import { FeatureFilterModalBase } from "./FeatureFilterModalBase";
import type {
  ControlledFilterEditorProps,
  FeatureFilterModalBaseProps,
} from "./FeatureFilterModalBase";
import type { FeatureFilterEditorProps } from "./type";

type FeatureFilterEditorModalInjectedProps = Omit<
  FeatureFilterEditorProps,
  keyof ControlledFilterEditorProps
>;

export interface FeatureFilterModalProps extends Omit<
  FeatureFilterModalBaseProps<FeatureFilterEditorProps>,
  "EditorComponent" | "editorProps"
> {
  fields: FeatureLayerFieldRead[];
}

export default function FeatureFilterModal({
  fields,
  ...props
}: FeatureFilterModalProps) {
  const editorProps: FeatureFilterEditorModalInjectedProps = useMemo(
    () => ({
      fields,
    }),
    [fields]
  );

  return (
    <FeatureFilterModalBase
      {...props}
      EditorComponent={FeatureFilterEditor}
      editorProps={editorProps}
    />
  );
}
