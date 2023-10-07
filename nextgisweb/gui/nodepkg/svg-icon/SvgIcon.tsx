import type { SvgIconProps } from "./type";

export function SvgIcon({ icon, ...rest }: SvgIconProps) {
    return (
        <svg className="icon" {...rest}>
            <use xlinkHref={`#icon-${icon}`} />
        </svg>
    );
}
