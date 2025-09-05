import classNames from "classnames";
import type { SVGProps } from "react";

import type { SizeType } from "../antd";

import "./SvgIcon.less";

export interface SvgIconProps extends SVGProps<SVGSVGElement> {
    icon?: string;
    size?: SizeType;
}

export function SvgIcon({ icon, size, className, ...rest }: SvgIconProps) {
    return (
        <svg
            className={classNames("icon", size && `icon-${size}`, className)}
            {...rest}
        >
            <use xlinkHref={`#icon-${icon}`} />
        </svg>
    );
}
