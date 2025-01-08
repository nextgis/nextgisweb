import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import { Layout, Spin } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import type { DisplayConfig } from "@nextgisweb/webmap/type/api";

import { Display } from "../display";
import { MapPane } from "../display/component/MapPane";
import type { MapRefs, TinyConfig } from "../type";

import { LoadingOutlined } from "@ant-design/icons";

import "../display/Display.css";
import "./DisplayTiny.css";

const { Content } = Layout;

const DisplayTinyComponent = observer(
    ({
        config,
        tinyConfig,
    }: {
        config: DisplayConfig;
        tinyConfig: TinyConfig;
    }) => {
        const [display] = useState<Display>(
            () =>
                new Display({
                    config,
                    tinyConfig,
                })
        );

        const [mapRefs, setMapRefs] = useState<MapRefs>();

        useEffect(() => {
            if (mapRefs) {
                display.startup(mapRefs);
            }
        }, [display, mapRefs]);

        return (
            <Layout style={{ width: "100%", height: "100%" }} className="tiny">
                <Content className="map-container" style={{ paddingLeft: 0 }}>
                    <MapPane setMapRefs={setMapRefs} />
                </Content>
            </Layout>
        );
    }
);
DisplayTinyComponent.displayName = "Display";

export default function DisplayTinyLoader({
    id,
    tinyConfig,
}: {
    id: number;
    tinyConfig: TinyConfig;
}) {
    const { data: config, isLoading } = useRouteGet("webmap.display_config", {
        id,
    });

    if (isLoading || !config) {
        return (
            <Spin
                indicator={<LoadingOutlined spin />}
                size="large"
                fullscreen
            />
        );
    }
    return <DisplayTinyComponent config={config} tinyConfig={tinyConfig} />;
}
