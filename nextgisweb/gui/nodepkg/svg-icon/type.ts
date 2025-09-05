import type { ReactNode } from "react";

import type { SvgIconProps } from "./SvgIcon";

export interface SvgIconLink
    extends React.DetailedHTMLProps<
        React.AnchorHTMLAttributes<HTMLAnchorElement>,
        HTMLAnchorElement
    > {
    iconProps?: SvgIconProps;
    children?: ReactNode;
    onClick?: () => void;
    icon?: string;
    fill?: SvgIconProps["fill"];
}
