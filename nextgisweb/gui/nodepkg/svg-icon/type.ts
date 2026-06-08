import type { AnchorHTMLAttributes, DetailedHTMLProps, ReactNode } from "react";

import type { SvgIconProps } from "./SvgIcon";

export interface SvgIconLink extends DetailedHTMLProps<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
> {
  iconProps?: SvgIconProps;
  children?: ReactNode;
  onClick?: () => void;
  icon?: string;
  fill?: SvgIconProps["fill"];
}
