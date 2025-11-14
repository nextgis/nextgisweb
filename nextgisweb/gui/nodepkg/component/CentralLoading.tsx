import type React from "react";

import { Spin } from "../antd";

import { LoadingOutlined } from "@ant-design/icons";

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
            <Spin
                indicator={
                    <LoadingOutlined
                        style={{
                            fontSize: 24,
                            ...indicatorStyle,
                        }}
                        spin={true}
                    />
                }
            />
        </div>
    );
}
