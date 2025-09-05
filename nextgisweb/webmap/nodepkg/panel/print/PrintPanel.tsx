import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useRef, useState } from "react";

import { Space } from "@nextgisweb/gui/antd";
import { CopyToClipboardButton } from "@nextgisweb/gui/buttons";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { PrintMapStore } from "@nextgisweb/webmap/print-map/store";

import { PanelContainer, PanelSection } from "../component";
import type { PanelPluginWidgetProps } from "../registry";

import PrintMapExport from "./PrintMapExport";
import { PrintElementsSettings } from "./component/PrintElementsSettings";
import { PrintMapPortal } from "./component/PrintMapPortal";
import { PrintPaperSettings } from "./component/PrintPaperSettings";
import { PrintScaleSettings } from "./component/PrintScaleSettings";
import { getPrintMapLink, getPrintUrlSettings } from "./util";

import { ShareAltOutlined } from "@ant-design/icons";

import "./PrintPanel.less";

const PrintPanel = observer<PanelPluginWidgetProps>(({ store, display }) => {
    const mapInit = useRef(false);
    const [printMapStore] = useState(
        () =>
            new PrintMapStore({
                titleText: display.config.webmapTitle,
                initCenter: getPrintUrlSettings().center,
            })
    );
    const printMapEl = useRef<HTMLDivElement | null>(null);

    const { close, title, visible } = store;

    const { center, scale } = printMapStore;

    const mapPositionRef = useRef({ center, scale });

    useEffect(() => {
        mapPositionRef.current = { center, scale };
    }, [center, scale]);

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
                    display.map.resolutionForScale(mapPositionRef.current.scale)
                );
            }

            mapInit.current = false;
        }
    }, [display]);

    const getTextToCopy = useCallback(() => {
        return getPrintMapLink(printMapStore);
    }, [printMapStore]);

    useEffect(() => {
        if (visible) {
            show();
        } else {
            hide();
        }
    }, [hide, show, visible]);

    return (
        <>
            {visible && (
                <PrintMapPortal
                    ref={printMapEl}
                    display={display}
                    printMapStore={printMapStore}
                />
            )}
            <PanelContainer title={title} close={close}>
                <PanelSection flex>
                    <PrintPaperSettings
                        display={display}
                        printMapStore={printMapStore}
                    />
                </PanelSection>

                <PanelSection title={gettext("Elements")} flex>
                    <PrintElementsSettings printMapStore={printMapStore} />
                </PanelSection>

                <PanelSection title={gettext("Scale")} flex>
                    <PrintScaleSettings printMapStore={printMapStore} />
                    <Space.Compact>
                        <PrintMapExport
                            display={display}
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
