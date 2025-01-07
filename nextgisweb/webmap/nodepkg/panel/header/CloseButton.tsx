import { Button } from "@nextgisweb/gui/antd";
import type { ButtonProps } from "@nextgisweb/gui/antd";
import { CloseIcon } from "@nextgisweb/gui/icon";

import "./CloseButton.less";

interface CloseButtonProps extends ButtonProps {
    close?: () => void;
}

/** @deprecated Use PanelTitle.ButtonClose from @nextgisweb/panel/component */
export function CloseButton({ close, ...props }: CloseButtonProps) {
    return (
        <Button
            className="ngw-webmap-close-button"
            shape="circle"
            type="text"
            icon={<CloseIcon />}
            onClick={() => {
                if (close) close();
            }}
            {...props}
        />
    );
}
