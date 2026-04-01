import { useCallback } from "react";

import { Spin } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook";

import { FeatureFilterEditor } from "../feature-filter/FeatureFilterEditor";
import type {
  FeatureFilterEditorProps,
  FilterValueWidgetProps,
} from "../feature-filter/type";

import { ResourceValueWidget } from "./ResourceValueWidget";

export interface ResourceFeatureFilterEditorProps extends Omit<
  FeatureFilterEditorProps,
  "fields"
> {
  resourceId: number;
}

export function ResourceFeatureFilterEditor(
  props: ResourceFeatureFilterEditorProps
) {
  const { resourceId, ...editorProps } = props;

  const { data, isLoading } = useRouteGet({
    name: "resource.item",
    params: { id: resourceId },
    options: { cache: true },
  });

  const fields = data?.feature_layer?.fields;

  const ValueWidget = useCallback(
    (props: FilterValueWidgetProps) => {
      return <ResourceValueWidget resourceId={resourceId} {...props} />;
    },
    [resourceId]
  );

  if (isLoading) {
    return <Spin />;
  }

  if (!fields) {
    return;
  }

  return (
    <FeatureFilterEditor
      {...editorProps}
      fields={fields}
      valueWidget={ValueWidget}
    />
  );
}
