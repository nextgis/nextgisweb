import type { ReactNode } from "react";

import { Space, Tooltip } from "@nextgisweb/gui/antd";
import type { ButtonProps } from "@nextgisweb/gui/antd";

export interface ActionBtnProps extends ButtonProps {
    icon?: ReactNode;
    label?: ReactNode;
    showLabel?: boolean;
    onClick?: React.MouseEventHandler<HTMLElement>;
}

export function ActionBtn({
    icon,
    label,
    showLabel = false,
    onClick,
    href,
    target,
}: ActionBtnProps) {
    const btn = (
        <a href={href} target={target} onClick={onClick}>
            <Space>
                {icon}
                {showLabel ? label : null}
            </Space>
        </a>
    );

    if (showLabel || !label) return btn;

    return <Tooltip title={label}>{btn}</Tooltip>;
}
