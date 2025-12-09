import type { CSSProperties, ReactNode } from "react";

import type { Button, SizeType } from "../antd";

export type ButtonProps = Parameters<typeof Button>[0];

export type CreateButtonActionProps = Record<string, any>;
export interface UseActionToolbarProps {
    size?: SizeType;
    props?: CreateButtonActionProps;
    isFit?: boolean;
}

export interface CreateButtonActionOptions<
    P extends CreateButtonActionProps = CreateButtonActionProps,
> extends Omit<ButtonProps, "icon" | "disabled"> {
    icon?: ReactNode;
    action?: (val?: P) => void;
    disabled?: ((val?: P) => boolean) | boolean;
    tooltip?: string;
}

export type ActionToolbarAction<
    P extends CreateButtonActionProps = CreateButtonActionProps,
> =
    | string
    | ReactNode
    | ((props: P) => ReactNode)
    | CreateButtonActionOptions<P>;

export interface ActionToolbarProps<
    P extends CreateButtonActionProps = CreateButtonActionProps,
> {
    size?: SizeType;
    style?: CSSProperties;
    pad?: boolean;
    borderBlockStart?: boolean;
    borderBlockEnd?: boolean;
    actions?: ActionToolbarAction<P>[];
    rightActions?: ActionToolbarAction<P>[];
    actionProps?: P;
    children?: ReactNode;
}
