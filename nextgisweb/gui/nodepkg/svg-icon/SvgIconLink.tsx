import { SvgIcon } from "./SvgIcon";
import type { SvgIconLink } from "./type";

export function SvgIconLink({
    children,
    onClick,
    icon,
    fill,
    iconProps,
    ...linkProps
}: SvgIconLink) {
    return (
        <a onClick={onClick} {...linkProps}>
            <SvgIcon {...{ icon, fill, ...iconProps }} />
            {children}
        </a>
    );
}
