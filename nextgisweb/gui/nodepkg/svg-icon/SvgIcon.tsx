import classNames from "classnames";

import type { SvgIconProps } from "./type";

export function SvgIcon({ icon, addClass, ...rest }: SvgIconProps) {
    return (
        <svg className={classNames("icon", addClass)} {...rest}>
            <use xlinkHref={`#icon-${icon}`} />
        </svg>
    );
}
