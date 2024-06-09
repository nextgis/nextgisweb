import type { ReactNode } from "react";

import { Button, Tooltip } from "@nextgisweb/gui/antd";

export interface ToggleProps {
    value: boolean;
    onChange: (v: boolean) => void;
    icon: ReactNode;
    title: string;
}

export function Toggle({ value, onChange, icon, title }: ToggleProps) {
    return (
        <Tooltip title={title}>
            <Button
                type="text"
                shape="circle"
                size="small"
                icon={icon}
                onClick={(e) => {
                    onChange(!value);
                    e.stopPropagation();
                }}
                style={value ? {} : { color: "var(--color-disabled)" }}
            />
        </Tooltip>
    );
}
