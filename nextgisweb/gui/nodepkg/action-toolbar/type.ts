import type { Button } from "antd";
import type { SizeType } from "antd/lib/config-provider/SizeContext";
import type { CSSProperties, ReactNode } from "react";

export type ButtonProps = Parameters<typeof Button>[0];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CreateButtonActionProps = Record<string, any>;
export interface UseActionToolbarProps {
    size?: SizeType;
    props?: CreateButtonActionProps;
    isFit?: boolean;
}

export interface CreateButtonActionOptions<
    P extends CreateButtonActionProps = CreateButtonActionProps,
> extends Omit<ButtonProps, "icon" | "disabled"> {
    icon?: string | JSX.Element;
    action?: (val?: P) => void;
    disabled?: ((val?: P) => boolean) | boolean;
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
    actions?: ActionToolbarAction<P>[];
    rightActions?: ActionToolbarAction<P>[];
    actionProps?: P;
    children?: ReactNode;
}
