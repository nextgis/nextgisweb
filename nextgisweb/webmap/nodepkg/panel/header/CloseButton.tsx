import { Button } from "@nextgisweb/gui/antd";
import type { ButtonProps } from "@nextgisweb/gui/antd";

import CloseIcon from "@nextgisweb/icon/material/close";
import "./CloseButton.less";

interface CloseButtonProps extends ButtonProps {
    close?: () => void;
}

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
