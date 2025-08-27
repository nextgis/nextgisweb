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
    onClick?: () => void | Promise<void>;
}

export type ButtonControlProps = ControlProps<ButtonControlOptions>;

export function ButtonControl({
    bar = true,
    title,
    style,
    margin = true,
    children,
    disabled,
    className,
    onClick,
    ...rest
}: ButtonControlProps) {
    const onBtnClick = async (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (onClick) await onClick();
    };

    return (
        <MapControl
            margin={margin}
            bar={bar}
            className={classNames(
                "ol-unselectable",
                "mapadapter-btn-ctrl",
                "mapadapter-ctrl-group"
            )}
            {...rest}
        >
            <button
                style={style}
                title={title}
                disabled={disabled}
                className={classNames("custom-button-control", className)}
                aria-label={title}
                onClick={onBtnClick}
            >
                {children === 0 ? "0" : children}
            </button>
        </MapControl>
    );
}
