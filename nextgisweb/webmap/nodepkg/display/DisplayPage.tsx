import { StrictMode, useEffect } from "react";

import { Spin, useToken } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook";

import { DisplayWidget } from "./DisplayWidget";

export default function DisplayPage({ id }: { id: number }) {
    const { data: config, isLoading } = useRouteGet("webmap.display_config", {
        id,
    });

    const { token } = useToken();

    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;

        const prevHtmlBehavior = html.style.overscrollBehaviorY;
        const prevBodyBehavior = body.style.overscrollBehaviorY;

        html.style.overscrollBehaviorY = "contain";
        body.style.overscrollBehaviorY = "contain";

        return () => {
            html.style.overscrollBehaviorY = prevHtmlBehavior;
            body.style.overscrollBehaviorY = prevBodyBehavior;
        };
    }, [token]);

    return (
        <StrictMode>
            {isLoading || !config ? (
                <Spin size="large" fullscreen />
            ) : (
                <DisplayWidget config={config} />
            )}
        </StrictMode>
    );
}
