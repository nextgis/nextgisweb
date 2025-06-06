import { Spin } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import type { DisplayConfig } from "@nextgisweb/webmap/type/api";

import type { MapRefs, TinyConfig } from "../type";

import type { Display } from "./Display";
import { DisplayWidget } from "./DisplayWidget";

import { LoadingOutlined } from "@ant-design/icons";

import "./DisplayWidget.css";
import "./DisplayWidget.less";

export interface DisplayComponentProps {
    config: DisplayConfig;
    tinyConfig?: TinyConfig;
    className?: string;
    display?: Display;
    setMapRefs?: (val: MapRefs) => void;
}

export default function DisplayPage({ id }: { id: number }) {
    const { data: config, isLoading } = useRouteGet("webmap.display_config", {
        id,
    });

    return (
        <>
            {isLoading || !config ? (
                <Spin
                    size="large"
                    fullscreen
                    indicator={<LoadingOutlined spin />}
                />
            ) : (
                <DisplayWidget config={config} />
            )}
        </>
    );
}
