import { observer } from "mobx-react-lite";
import type { Coordinate } from "ol/coordinate";
import { useCallback, useEffect, useRef, useState } from "react";

import { Space } from "@nextgisweb/gui/antd";
import { CopyToClipboardButton } from "@nextgisweb/gui/buttons";
import { useObjectState } from "@nextgisweb/gui/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { PrintMapSettings } from "../../print-map/type";
import { PanelContainer, PanelSection } from "../component";
import type { PanelPluginWidgetProps } from "../registry";

import PrintMapExport from "./PrintMapExport";
import { PrintElementsSettings } from "./component/PrintElementsSettings";
import { PrintPaperSettings } from "./component/PrintPaperSettings";
import { PrintScaleSettings } from "./component/PrintScaleSettings";
import { usePrintMap } from "./hook/usePrintMap";
import {
    defaultPanelMapSettings,
    getPrintMapLink,
    getPrintUrlSettings,
} from "./util";

import { ShareAltOutlined } from "@ant-design/icons";

import "./PrintPanel.less";

const PrintPanel = observer<PanelPluginWidgetProps>(({ store, display }) => {
    const mapInit = useRef(false);

    const { close, title, visible } = store;

    const [center, setCenter] = useState<Coordinate>();
    const [printMapScale, setPrintMapScale] = useState<number>();

    const [mapSettings, setMapSettings] = useObjectState<PrintMapSettings>(() =>
        defaultPanelMapSettings(display.config.webmapTitle)
    );

    const updateMapSettings = useCallback(
        (updateSettings: Partial<PrintMapSettings>) => {
            setMapSettings((old) => ({ ...old, ...updateSettings }));
        },
        [setMapSettings]
    );

    const getCenterFromUrl = useCallback((): Coordinate | null => {
        if (mapInit.current) {
            return null;
        }
        const urlSettings = getPrintUrlSettings();
        return urlSettings.center || null;
    }, []);

    const { createPrintMapComp, printMapEl, destroy } = usePrintMap({
        settings: mapSettings,
        display,
        getCenterFromUrl,
        onScaleChange: setPrintMapScale,
        onCenterChange: setCenter,
    });

    const show = useCallback(() => {
        if (!mapInit.current) {
            createPrintMapComp();

            mapInit.current = true;
        }
    }, [createPrintMapComp]);

    const hide = useCallback(() => {
        if (mapInit.current) {
            destroy();
            mapInit.current = false;
        }
    }, [destroy]);

    const getTextToCopy = useCallback(() => {
        return getPrintMapLink(mapSettings);
    }, [mapSettings]);

    useEffect(() => {
        visible ? show() : hide();
    }, [hide, show, visible]);

    useEffect(() => {
        if (!center) {
            return;
        }
        updateMapSettings({ center });
    }, [center, updateMapSettings]);

    return (
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
                    printMapScale={printMapScale}
                    mapSettings={mapSettings}
                    updateMapSettings={updateMapSettings}
                />
                <Space.Compact>
                    <PrintMapExport
                        display={display}
                        mapSettings={mapSettings}
                        printMapEl={printMapEl.current}
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
    );
});

PrintPanel.displayName = "PrintPanel";
export default PrintPanel;
