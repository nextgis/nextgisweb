import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useState } from "react";

import { Spin } from "@nextgisweb/gui/antd";
import { routeURL } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { handlePostMessage } from "../compat/util/handlePostMessage";
import { Display } from "../display";
import { DisplayWidget } from "../display/DisplayWidget";
import type { DisplayComponentProps } from "../display/DisplayWidget";
import { LinkToMainMap } from "../map-controls/control/LinkToMainMap";
import type { MapRefs, TinyConfig } from "../type";

import { LoadingOutlined } from "@ant-design/icons";

const DisplayTinyWidget = observer(
    ({ config, tinyConfig }: DisplayComponentProps) => {
        const [display] = useState<Display>(
            () =>
                new Display({
                    config,
                    tinyConfig,
                })
        );

        const { ready: panelsReady } = display.panelManager;

        const [mapRefs, setMapRefs] = useState<MapRefs>();

        const addLinkToMainMap = useCallback(() => {
            if (
                !tinyConfig ||
                display.urlParams.linkMainMap !== "true" ||
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
            display.urlParams.linkMainMap,
            display.map.olMap,
            mapRefs,
            tinyConfig,
        ]);

        useEffect(
            function buildTinyPanels() {
                if (panelsReady) {
                    return;
                }

                const activePanel = display.panelManager.getActivePanelName();
                if (!activePanel) {
                    return;
                }
                display.panelManager.deactivatePanel();
            },
            [display.panelManager, panelsReady]
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
            <DisplayWidget
                className="ngw-webmap-display-tiny"
                display={display}
                config={config}
                setMapRefs={setMapRefs}
            />
        );
    }
);
DisplayTinyWidget.displayName = "DisplayTinyWidget";

export default function DisplayTinyPage({ id }: { id: number }) {
    const { data: config, isLoading } = useRouteGet("webmap.display_config", {
        id,
    });

    const [tinyConfig] = useState<TinyConfig>(() => ({
        mainDisplayUrl: routeURL("webmap.display", id) + "?" + location.search,
    }));

    if (isLoading || !config) {
        return (
            <Spin
                indicator={<LoadingOutlined spin />}
                size="large"
                fullscreen
            />
        );
    }
    return <DisplayTinyWidget config={config} tinyConfig={tinyConfig} />;
}
