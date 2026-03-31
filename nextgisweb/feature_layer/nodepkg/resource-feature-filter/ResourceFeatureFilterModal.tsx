import { useMemo } from "react";

import { FeatureFilterModalBase } from "../feature-filter/FeatureFilterModalBase";
import type {
  ControlledFilterEditorProps,
  FeatureFilterModalBaseProps,
} from "../feature-filter/FeatureFilterModalBase";

import { ResourceFeatureFilterEditor } from "./ResourceFeatureFilterEditor";
import type { ResourceFeatureFilterEditorProps } from "./ResourceFeatureFilterEditor";

type ResourceFeatureFilterEditorModalInjectedProps = Omit<
  ResourceFeatureFilterEditorProps,
  keyof ControlledFilterEditorProps
>;

export interface FeatureFilterModalProps extends Omit<
  FeatureFilterModalBaseProps<ResourceFeatureFilterEditorProps>,
  "EditorComponent" | "editorProps"
> {
  resourceId: number;
}

export default function ResourceFeatureFilterModal({
  resourceId,
  ...props
}: FeatureFilterModalProps) {
  const editorProps: ResourceFeatureFilterEditorModalInjectedProps = useMemo(
    () => ({
      resourceId,
    }),
    [resourceId]
  );

  return (
    <FeatureFilterModalBase<ResourceFeatureFilterEditorProps>
      {...props}
      EditorComponent={ResourceFeatureFilterEditor}
      editorProps={editorProps}
    />
  );
}
