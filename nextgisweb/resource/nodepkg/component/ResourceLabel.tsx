import type { ReactNode } from "react";

import type { ResourceCls } from "@nextgisweb/resource/type/api";

import { ResourceIcon } from "../icon";

import { ResourceLink } from "./ResourceLink";

import "./ResourceLabel.less";

export interface ResourceLabelProps {
  cls?: ResourceCls;
  resourceId?: number;
  label: ReactNode;
}

export function ResourceLabel({ cls, label, resourceId }: ResourceLabelProps) {
  return (
    <div className="ngw-resource-resource-label">
      {cls && (
        <span className="icon">
          <ResourceIcon identity={cls} />
        </span>
      )}
      <span className="label">{label}</span>
      {typeof resourceId === "number" && (
        <ResourceLink
          className="link"
          target="_blank"
          resourceId={resourceId}
        />
      )}
    </div>
  );
}
