import type { ReactNode, SVGProps } from "react";

export interface SvgIconProps extends SVGProps<SVGSVGElement> {
    icon?: string;
}

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
