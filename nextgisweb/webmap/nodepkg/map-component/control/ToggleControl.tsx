import classNames from "classnames";
import { useMemo } from "react";

import { ButtonControl } from "./ButtonControl";
import type { ButtonControlProps } from "./ButtonControl";
import type { ControlProps } from "./MapControl";
import { useToggleControl } from "./hook/useToggleControl";
import type {
    ToggleActiveProp,
    UseToggleControlOptions,
} from "./hook/useToggleControl";

function getVal<T>(
    val: ToggleActiveProp<T> | undefined,
    v: boolean
): T | undefined {
    return typeof val === "function"
        ? (val as (s: boolean) => T)(v)
        : (val as T | undefined);
}

type ToggleControlOptions = Omit<
    ButtonControlProps,
    "title" | "style" | "onClick"
> & {
    title?: ToggleActiveProp<string | undefined>;
    style?: ToggleActiveProp<React.CSSProperties | undefined>;
    className?: string;
    statusClassName?: ToggleActiveProp<string | undefined>;
    onClick?: (value: boolean) => void | Promise<void>;
} & Omit<UseToggleControlOptions, "toggle">;

export type ToggleControlProps = ControlProps<ToggleControlOptions>;

export function ToggleControl({
    statusClassName,
    className,
    children,
    style,
    title,
    onClick,
    ...rest
}: ToggleControlProps) {
    const { value, toggle } = useToggleControl({ ...rest, onToggle: onClick });

    const styleToggleBtn = useMemo(
        () => (value ? { color: "revert-layer" } : { color: "gray" }),
        [value]
    );

    const btnTitle = getVal(title, value);
    const btnStyle = useMemo(
        () => (style ? getVal(style, value) : styleToggleBtn),
        [value, style, styleToggleBtn]
    );

    return (
        <ButtonControl
            {...rest}
            title={btnTitle}
            className={classNames(className, getVal(statusClassName, value))}
            style={btnStyle}
            onClick={toggle}
        >
            {children}
        </ButtonControl>
    );
}
