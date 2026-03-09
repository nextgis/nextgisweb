import type React from "react";
import type { HTMLAttributeAnchorTarget } from "react";

import { Space } from "@nextgisweb/gui/antd";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

import { ResourceIcon } from "../icon";

import { ResourceLink } from "./ResourceLink";

export interface ResourceLabelProps {
  cls?: ResourceCls;
  resourceId?: number;
  label: React.ReactNode;
  target?: HTMLAttributeAnchorTarget;
}

export function ResourceLabel({
  cls,
  label,
  target,
  resourceId,
}: ResourceLabelProps) {
  return (
    <Space>
      {cls && <ResourceIcon identity={cls} />}
      {label}
      {typeof resourceId === "number" && (
        <ResourceLink target={target} resourceId={resourceId} />
      )}
    </Space>
  );
}
