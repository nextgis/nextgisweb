import type { ReactNode } from "react";

import { Badge, Space } from "@nextgisweb/gui/antd";

import { DirtyMark } from "./DirtyMark";

interface TabLabelProps {
    dirty: boolean;
    label: string | ReactNode;
    counter?: number | string | null;
}

export function TabLabel({ dirty, label, counter }: TabLabelProps) {
    return (
        <Space>
            {label}
            {(counter && (
                <Badge
                    count={counter}
                    color={dirty ? "var(--primary)" : "var(--text-secondary)"}
                    size="small"
                />
            )) || <DirtyMark dirty={dirty} />}
        </Space>
    );
}
