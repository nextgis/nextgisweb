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

import "./ToggleControl.less";

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
    "title" | "style" | "onChange"
> & {
    title?: ToggleActiveProp<string | undefined>;
    style?: ToggleActiveProp<React.CSSProperties | undefined>;
    className?: string;
    statusClassName?: ToggleActiveProp<string | undefined>;
    onChange?: (value: boolean) => void | Promise<void>;
} & Omit<UseToggleControlOptions, "toggle">;

export type ToggleControlProps = ControlProps<ToggleControlOptions>;

export function ToggleControl({
    statusClassName,
    className,
    children,
    style,
    title,
    onChange,
    ...rest
}: ToggleControlProps) {
    const { value, toggle } = useToggleControl({ ...rest, onChange });

    const btnTitle = getVal(title, value);
    const btnStyle = useMemo(
        () => (style ? getVal(style, value) : {}),
        [value, style]
    );

    return (
        <ButtonControl
            {...rest}
            title={btnTitle}
            className={classNames(className, getVal(statusClassName, value), {
                "toggle-on": value,
            })}
            btnStyle={btnStyle}
            onClick={toggle}
        >
            {children}
        </ButtonControl>
    );
}
