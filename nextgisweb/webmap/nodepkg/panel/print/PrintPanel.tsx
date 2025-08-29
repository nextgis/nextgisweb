import { observer } from "mobx-react-lite";
import type { Coordinate } from "ol/coordinate";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Space } from "@nextgisweb/gui/antd";
import { CopyToClipboardButton } from "@nextgisweb/gui/buttons";
import { useObjectState } from "@nextgisweb/gui/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { PrintMapStore } from "@nextgisweb/webmap/print-map/PrintMapStore";
import { scaleToResolution } from "@nextgisweb/webmap/print-map/utils";

import type { PrintMapSettings } from "../../print-map/type";
import { PanelContainer, PanelSection } from "../component";
import type { PanelPluginWidgetProps } from "../registry";

import PrintMapExport from "./PrintMapExport";
import { PrintElementsSettings } from "./component/PrintElementsSettings";
import { PrintMapPortal } from "./component/PrintMapPortal";
import { PrintPaperSettings } from "./component/PrintPaperSettings";
import { PrintScaleSettings } from "./component/PrintScaleSettings";
import {
    defaultPanelMapSettings,
    getPrintMapLink,
    getPrintUrlSettings,
} from "./util";

import { ShareAltOutlined } from "@ant-design/icons";

import "./PrintPanel.less";

const PrintPanel = observer<PanelPluginWidgetProps>(({ store, display }) => {
    const mapInit = useRef(false);
    const [printMapStore] = useState(() => new PrintMapStore());
    const printMapEl = useRef<HTMLDivElement | null>(null);

    const { close, title, visible } = store;

    const [center, setCenter] = useState<Coordinate>();
    const [scale, setScale] = useState<number>();

    const mapPositionRef = useRef({ center, scale });

    useEffect(() => {
        mapPositionRef.current = { center, scale };
    }, [center, scale]);

    const [mapSettings, setMapSettings] = useObjectState<PrintMapSettings>(() =>
        defaultPanelMapSettings(display.config.webmapTitle)
    );

    const updateMapSettings = useCallback(
        (updateSettings: Partial<PrintMapSettings>) => {
            setMapSettings((old) => ({ ...old, ...updateSettings }));
        },
        [setMapSettings]
    );

    const initCenter = useMemo((): Coordinate | null => {
        return getPrintUrlSettings().center ?? null;
    }, []);

    const show = useCallback(() => {
        if (!mapInit.current) {
            mapInit.current = true;
        }
    }, []);

    const hide = useCallback(() => {
        if (mapInit.current) {
            // Sync the main map's view with last print preview position before closing
            const mainMapView = display.map.olMap.getView();
            if (mapPositionRef.current.center) {
                mainMapView.setCenter(mapPositionRef.current.center);
            }
            if (mapPositionRef.current.scale) {
                mainMapView.setResolution(
                    scaleToResolution(mapPositionRef.current.scale)
                );
            }

            mapInit.current = false;
        }
    }, [display]);

    const getTextToCopy = useCallback(() => {
        return getPrintMapLink(mapSettings);
    }, [mapSettings]);

    useEffect(() => {
        if (visible) {
            show();
        } else {
            hide();
        }
    }, [hide, show, visible]);

    useEffect(() => {
        if (!center) {
            return;
        }
        updateMapSettings({ center });
    }, [center, updateMapSettings]);

    return (
        <>
            {visible && (
                <PrintMapPortal
                    ref={printMapEl}
                    display={display}
                    initCenter={initCenter}
                    mapSettings={mapSettings}
                    printMapStore={printMapStore}
                    onScaleChange={setScale}
                    onCenterChange={setCenter}
                />
            )}
            <PanelContainer title={title} close={close}>
                <PanelSection flex>
                    <PrintPaperSettings
                        display={display}
                        mapSettings={mapSettings}
                        updateMapSettings={updateMapSettings}
                    />
                </PanelSection>

                <PanelSection title={gettext("Elements")} flex>
                    <PrintElementsSettings
                        mapSettings={mapSettings}
                        updateMapSettings={updateMapSettings}
                    />
                </PanelSection>

                <PanelSection title={gettext("Scale")} flex>
                    <PrintScaleSettings
                        printMapScale={scale}
                        mapSettings={mapSettings}
                        updateMapSettings={updateMapSettings}
                    />
                    <Space.Compact>
                        <PrintMapExport
                            display={display}
                            mapSettings={mapSettings}
                            printMapEl={printMapEl.current}
                            printMapStore={printMapStore}
                        />
                        <CopyToClipboardButton
                            type="default"
                            getTextToCopy={getTextToCopy}
                            icon={<ShareAltOutlined />}
                            title={gettext("Copy link to the print map")}
                            iconOnly
                        />
                    </Space.Compact>
                </PanelSection>
            </PanelContainer>
        </>
    );
});

PrintPanel.displayName = "PrintPanel";
export default PrintPanel;
