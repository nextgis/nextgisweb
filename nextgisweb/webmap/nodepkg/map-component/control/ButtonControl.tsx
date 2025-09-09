import classNames from "classnames";
import type { MouseEvent, ReactNode } from "react";

import type { CreateControlOptions } from "@nextgisweb/webmap/control-container/ControlContainer";

import { MapControl } from "./MapControl";
import type { ControlProps } from "./MapControl";
import "./ButtonControl.css";

interface ButtonControlOptions extends CreateControlOptions {
    disabled?: boolean;
    children?: ReactNode;
    title?: string;
    btnStyle?: React.CSSProperties;
    btnClassName?: string;
    onClick?: () => void | Promise<void>;
}

export type ButtonControlProps = ControlProps<ButtonControlOptions>;

export function ButtonControl({
    bar = true,
    title,
    style,
    margin = true,
    btnStyle,
    children,
    disabled,
    className,
    btnClassName,
    onClick,
    ...rest
}: ButtonControlProps) {
    const onBtnClick = async (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (onClick) await onClick();
    };

    return (
        <MapControl
            bar={bar}
            style={style}
            margin={margin}
            className={classNames(
                "ol-unselectable",
                "mapadapter-btn-ctrl",
                "mapadapter-ctrl-group",
                className
            )}
            {...rest}
        >
            <button
                title={title}
                disabled={disabled}
                className={classNames("custom-button-control", btnClassName)}
                aria-label={title}
                onClick={onBtnClick}
                style={btnStyle}
            >
                {children === 0 ? "0" : children}
            </button>
        </MapControl>
    );
}
