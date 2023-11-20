import type { ReactNode } from "react";

import { CloseButton } from "./CloseButton";
import "./PanelHeader.less";

interface PanelHeaderProps {
    title: string;
    close?: () => void;
    children?: ReactNode;
}

export function PanelHeader({ title, close, children }: PanelHeaderProps) {
    return (
        <div className="ngw-webmap-panel-header">
            <span>{title}</span>
            {children}
            <div className="spacer"></div>
            <CloseButton close={close} />
        </div>
    );
}
