import { Button } from "@nextgisweb/gui/antd";

import CloseIcon from "@nextgisweb/icon/material/close";

import "./CloseButton.less";

export function CloseButton({ close, ...props }) {
    return (
        <Button
            className="ngw-webmap-close-button"
            shape="circle"
            type="text"
            icon={<CloseIcon />}
            onClick={() => close()}
            {...props}
        />
    );
}
