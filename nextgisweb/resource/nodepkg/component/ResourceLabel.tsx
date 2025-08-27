import type React from "react";
import type { HTMLAttributeAnchorTarget } from "react";

import { Space } from "@nextgisweb/gui/antd";
import { OpenInNewIcon } from "@nextgisweb/gui/icon";
import { routeURL } from "@nextgisweb/pyramid/api";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

import { ResourceIcon } from "../icon";

export interface ResourceLabelProps {
    cls: ResourceCls;
    resourceId?: number;
    label: React.ReactNode;
    target?: HTMLAttributeAnchorTarget;
}

export function ResourceLabel({
    cls,
    label,
    target = "_blank",
    resourceId,
}: ResourceLabelProps) {
    return (
        <Space>
            <ResourceIcon identity={cls} />
            {label}
            {typeof resourceId === "number" && (
                <a
                    href={routeURL("resource.show", resourceId)}
                    target={target}
                    onMouseDown={(evt) => {
                        // Prevent from opening picker
                        evt.stopPropagation();
                    }}
                >
                    <OpenInNewIcon />
                </a>
            )}
        </Space>
    );
}
