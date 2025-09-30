import { StrictMode } from "react";

import { Spin } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook";

import { DisplayWidget } from "./DisplayWidget";

import { LoadingOutlined } from "@ant-design/icons";

export default function DisplayPage({ id }: { id: number }) {
    const { data: config, isLoading } = useRouteGet("webmap.display_config", {
        id,
    });

    return (
        <StrictMode>
            {isLoading || !config ? (
                <Spin
                    size="large"
                    fullscreen
                    indicator={<LoadingOutlined spin />}
                />
            ) : (
                <DisplayWidget config={config} />
            )}
        </StrictMode>
    );
}
