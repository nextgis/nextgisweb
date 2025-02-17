import type { ReactNode } from "react";

import { Badge, Space } from "@nextgisweb/gui/antd";

import { DirtyMark } from "./DirtyMark";

import ErrorIcon from "@nextgisweb/icon/material/error";

interface TabLabelProps {
    dirty?: boolean;
    label: string | ReactNode;
    counter?: number | string | null;
    isValid?: boolean;
}

export function TabLabel({ dirty, label, counter, isValid }: TabLabelProps) {
    return (
        <Space>
            {label}
            {counter ? (
                <Badge
                    count={counter}
                    color={dirty ? "var(--primary)" : "var(--text-secondary)"}
                    size="small"
                />
            ) : dirty ? (
                <DirtyMark dirty={dirty} />
            ) : isValid === false ? (
                <span style={{ color: "var(--error)" }}>
                    <ErrorIcon />
                </span>
            ) : null}
        </Space>
    );
}
