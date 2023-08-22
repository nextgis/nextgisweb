import { CloseButton } from "./CloseButton";

import "./PanelHeader.less";

export function PanelHeader({ title, close, children }) {
    return (
        <div className="ngw-webmap-panel-header">
            <span>{title}</span>
            {children}
            <div className="spacer"></div>
            <CloseButton {...{ close }} />
        </div>
    );
}
