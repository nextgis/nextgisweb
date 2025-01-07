import { forwardRef } from "react";
import type { ReactNode } from "react";

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
}

export function PanelTitle({
    className,
    title,
    close,
    suffix,
}: PanelTitleProps) {
    const themeVariables = useThemeVariables({
        "theme-color-border-secondary": "colorBorderSecondary",
    });

    return (
        <div className={className} style={themeVariables}>
            <div className="content">{title}</div>
            {suffix}
            <PanelTitle.ButtonClose close={close} />
        </div>
    );
}

PanelTitle.Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
    return <Button ref={ref} type="text" size="small" {...props} />;
});

PanelTitle.ButtonClose = forwardRef<HTMLButtonElement, { close?: () => void }>(
    ({ close }, ref) => {
        return (
            <PanelTitle.Button ref={ref} icon={<CloseIcon />} onClick={close} />
        );
    }
);

PanelTitle.Button.displayName = "PanelTitle.Button";
PanelTitle.ButtonClose.displayName = "PanelTitle.ButtonClose";
