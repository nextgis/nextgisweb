import type { ReactNode } from "react";

import { Space } from "@nextgisweb/gui/antd";
import type { ButtonProps } from "@nextgisweb/gui/antd";

export interface ActionBtnProps extends ButtonProps {
  icon?: ReactNode;
  label?: string;
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
  if (showLabel && label) {
    return (
      <a href={href} target={target} onClick={onClick}>
        <Space>
          {icon}
          {label}
        </Space>
      </a>
    );
  } else {
    return (
      <a href={href} target={target} title={label} onClick={onClick}>
        {icon}
      </a>
    );
  }
}
