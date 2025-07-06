import type { ReactNode, Ref } from "react";

import { Button } from "@nextgisweb/gui/antd";
import type { ButtonProps } from "@nextgisweb/gui/antd";
import { useThemeVariables } from "@nextgisweb/gui/hook";
import { CloseIcon } from "@nextgisweb/gui/icon";

import "./PanelTitle.less";

export interface PanelTitleProps {
    className: string;
    title?: ReactNode;
    suffix?: ReactNode;
    close?: () => void;
    ref?: Ref<HTMLDivElement>;
}

export function PanelTitle({
    className,
    title,
    suffix,
    close,
    ref,
}: PanelTitleProps) {
    const themeVariables = useThemeVariables({
        "theme-color-border-secondary": "colorBorderSecondary",
    });

    return (
        <div className={className} style={themeVariables} ref={ref}>
            <div className="content">{title}</div>
            {suffix}
            <PanelTitle.ButtonClose close={close} />
        </div>
    );
}

export interface PanelTitleButtonProps extends ButtonProps {
    ref?: Ref<HTMLButtonElement>;
}

export function PanelTitleButton({ ref, ...props }: PanelTitleButtonProps) {
    return <Button ref={ref} type="text" size="small" {...props} />;
}

export interface PanelTitleButtonCloseProps {
    close?: () => void;
    ref?: Ref<HTMLButtonElement>;
}

export function PanelTitleButtonClose({
    ref,
    close,
}: PanelTitleButtonCloseProps) {
    return <PanelTitleButton ref={ref} icon={<CloseIcon />} onClick={close} />;
}

PanelTitle.Button = PanelTitleButton;
PanelTitle.ButtonClose = PanelTitleButtonClose;
