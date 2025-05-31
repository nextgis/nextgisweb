import classNames from "classnames";

import type { SvgIconProps } from "./type";

export function SvgIcon({ icon, className, ...rest }: SvgIconProps) {
    return (
        <svg className={classNames("icon", className)} {...rest}>
            <use xlinkHref={`#icon-${icon}`} />
        </svg>
    );
}
