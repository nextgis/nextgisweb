import type { SizeType } from "antd/lib/config-provider/SizeContext";
import type { Button } from "antd";
import type { CSSProperties, ReactNode } from "react";

export type ButtonProps = Parameters<typeof Button>[0];

type Props = Record<string, unknown>;

export interface UseActionToolbarProps {
    size?: SizeType;
    props?: Props;
}

export interface CreateButtonActionOptions
    extends Omit<ButtonProps, "icon" | "disabled"> {
    icon?: string | JSX.Element;
    action?: (val?: Props) => void;
    disabled?: ((val?: Props) => boolean) | boolean;
}

export type ActionToolbarAction =
    | string
    | JSX.Element
    | CreateButtonActionOptions;

export interface ActionToolbarProps {
    size?: SizeType;
    style?: CSSProperties;
    actions: ActionToolbarAction[];
    rightActions?: ActionToolbarAction[];
    actionProps?: Props;
    children?: ReactNode;
}
