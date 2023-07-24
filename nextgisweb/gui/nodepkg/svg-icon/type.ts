import type { ReactNode, SVGProps } from "react";

export interface SvgIconProps extends SVGProps<SVGSVGElement> {
    icon?: string;
}

export interface SvgIconLink extends Pick<SvgIconProps, "fill" | "icon"> {
    iconProps?: SvgIconProps;
    children?: ReactNode;
    onClick?: () => void;
}
