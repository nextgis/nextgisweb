import type { ReactNode } from "react";

import { useThemeVariables } from "@nextgisweb/gui/hook";

import { CloseButton } from "./CloseButton";

import "./PanelHeader.less";

interface PanelHeaderProps {
    title: string;
    close?: () => void;
    children?: ReactNode;
}

export function PanelHeader({ title, close, children }: PanelHeaderProps) {
    const themeVariables = useThemeVariables({
        "color-bg-container": "colorBgContainer",
        "color-border": "colorBorder",
    });

    return (
        <div className="ngw-webmap-panel-header" style={themeVariables}>
            <span>{title}</span>
            {children}
            <div className="spacer"></div>
            <CloseButton close={close} />
        </div>
    );
}
