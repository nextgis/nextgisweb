import classNames from "classnames";
import type { MouseEvent, ReactNode } from "react";

import type { CreateControlOptions } from "@nextgisweb/webmap/control-container/ControlContainer";

import { MapControl } from "./MapControl";
import type { ControlProps } from "./MapControl";
import "./ButtonControl.css";

interface ButtonControlOptions extends CreateControlOptions {
    children?: ReactNode;
    title?: string;
    onClick?: () => void | Promise<void>;
}

export type ButtonControlProps = ControlProps<ButtonControlOptions>;

export function ButtonControl({
    className,
    margin = true,
    bar = true,
    title,
    style,
    children,
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
                className={classNames("custom-button-control", className)}
                title={title}
                aria-label={title}
                onClick={onBtnClick}
                style={style}
            >
                {children === 0 ? "0" : children}
            </button>
        </MapControl>
    );
}
