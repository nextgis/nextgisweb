import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useState } from "react";

import { Spin } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { handlePostMessage } from "../compat/util/handlePostMessage";
import { Display } from "../display";
import { DisplayComponent } from "../display/DisplayComponent";
import type { DisplayComponentProps } from "../display/DisplayComponent";
import { LinkToMainMap } from "../map-controls/control/LinkToMainMap";
import type { MapRefs, TinyConfig } from "../type";

import { LoadingOutlined } from "@ant-design/icons";

import "../display/Display.css";
import "./DisplayTiny.css";

const DisplayTinyComponent = observer(
    ({ config, tinyConfig }: DisplayComponentProps) => {
        const [display] = useState<Display>(
            () =>
                new Display({
                    config,
                    tinyConfig,
                })
        );

        const { ready: panelsReady } = display.panelsManager;

        const [mapRefs, setMapRefs] = useState<MapRefs>();

        const addLinkToMainMap = useCallback(() => {
            if (
                !tinyConfig ||
                display._urlParams.linkMainMap !== "true" ||
                !mapRefs
            ) {
                return;
            }
            display.map.olMap.addControl(
                new LinkToMainMap({
                    url: tinyConfig.mainDisplayUrl,
                    target: mapRefs.rightTopControlPane,
                    tipLabel: gettext("Open full map"),
                })
            );
        }, [
            display._urlParams.linkMainMap,
            display.map.olMap,
            mapRefs,
            tinyConfig,
        ]);

        useEffect(
            function buildTinyPanels() {
                if (panelsReady) {
                    return;
                }

                const activePanel = display.panelsManager.getActivePanelName();
                if (!activePanel) {
                    return;
                }
                display.panelsManager.deactivatePanel();
                // display.panelsManager.activatePanel(activePanel);
            },
            [display.panelsManager, panelsReady]
        );

        const handleTinyDisplayMode = useCallback(() => {
            addLinkToMainMap();
            handlePostMessage(display);
        }, [addLinkToMainMap, display]);

        useEffect(() => {
            if (mapRefs) {
                display.startup(mapRefs);
                handleTinyDisplayMode();
            }
        }, [display, handleTinyDisplayMode, mapRefs]);

        return (
            <DisplayComponent
                className="tiny tiny-panels"
                display={display}
                config={config}
                setMapRefs={setMapRefs}
            />
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