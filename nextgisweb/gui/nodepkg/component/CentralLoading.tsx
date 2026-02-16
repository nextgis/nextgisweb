import type React from "react";

import { Spin } from "../antd";

export function CentralLoading({
    style,
    indicatorStyle,
}: {
    style?: React.CSSProperties;
    indicatorStyle?: React.CSSProperties;
}) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                width: "100%",
                ...style,
            }}
        >
            <Spin styles={{ indicator: { fontSize: 24, ...indicatorStyle } }} />
        </div>
    );
}
