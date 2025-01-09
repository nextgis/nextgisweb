import { toPng } from "html-to-image";
import { observer } from "mobx-react-lite";
import { useState } from "react";

import { Button, Dropdown, Space } from "@nextgisweb/gui/antd";
import type { MenuProps } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { Display } from "@nextgisweb/webmap/display";
import type { PrintBody, PrintFormat } from "@nextgisweb/webmap/type/api";

import { printMapStore } from "../../../print-map/PrintMapStore";
import type { PrintMapSettings } from "../../../print-map/type";
import { exportFormats } from "../options";

import { legendItemsToModel, legendToModel } from "./legendToModel";

import { DownOutlined } from "@ant-design/icons";

interface ExportProps {
    display: Display;
    format: PrintFormat;
    element: HTMLElement;
    settings: PrintMapSettings;
    printMapStore: typeof printMapStore;
    setLoad: (loading: boolean) => void;
    print?: boolean;
}

const runExport = ({
    display,
    format,
    element,
    settings,
    printMapStore,
    setLoad,
}: ExportProps) => {
    setLoad(true);

    let toPngPromise;
    try {
        toPngPromise = toPng(element);
    } catch {
        setLoad(false);
        return;
    }

    toPngPromise
        .then((dataUrl) => {
            const { width, height, margin } = settings;

            let legend;
            if (printMapStore.legendCoords.displayed) {
                const legendItems = legendItemsToModel(
                    printMapStore.webMapItems
                );
                legend = legendToModel(legendItems, printMapStore.legendCoords);
            }

            let title;
            if (printMapStore.titleCoords.displayed) {
                const [titleEl] = document.querySelectorAll(
                    "#printMap .print-title"
                );
                const content = titleEl.innerHTML;
                title = { ...printMapStore.titleCoords, content };
            }

            const content = dataUrl.substring("data:image/png;base64,".length);
            const map = { ...printMapStore.mapCoords, content };

            const body: PrintBody = {
                width,
                height,
                margin,
                legend,
                title,
                map,
                format,
            };

            const webmapId = display.config.webmapId;
            route("webmap.print", { id: webmapId })
                .post({ json: body })
                .then((blob) => {
                    const file = window.URL.createObjectURL(blob as Blob);
                    const tab = window.open();
                    if (tab) {
                        tab.location.href = file;
                        setLoad(false);
                    }
                })
                .finally(() => {
                    setLoad(false);
                });
        })
        .catch(() => {
            setLoad(false);
        });
};

interface PrintMapExportProps {
    mapSettings: PrintMapSettings;
    printMapEl?: HTMLElement;
    display: Display;
}

export const PrintMapExport = observer(
    ({ printMapEl, mapSettings, display }: PrintMapExportProps) => {
        const [loadingFile, setLoadingFile] = useState(false);
        const [loadingPrint, setLoadingPrint] = useState(false);

        const exportToFormat = (
            format: PrintFormat,
            print: boolean = false,
            setLoad: (loading: boolean) => void
        ) => {
            if (!printMapEl) {
                return;
            }
            const [viewport] = printMapEl.getElementsByClassName("print-olmap");
            runExport({
                display,
                format,
                element: viewport as HTMLElement,
                print,
                settings: mapSettings,
                printMapStore,
                setLoad,
            });
        };

        const exportFormatsProps: MenuProps = {
            items: exportFormats,
            onClick: (item) => {
                exportToFormat(item.key as PrintFormat, false, setLoadingFile);
            },
        };

        return (
            <Space.Compact>
                <Button
                    loading={loadingPrint}
                    type="primary"
                    onClick={() => exportToFormat("pdf", true, setLoadingPrint)}
                >
                    {gettext("Print")}
                </Button>
                <Dropdown menu={exportFormatsProps} disabled={loadingFile}>
                    <Button loading={loadingFile}>
                        <Space>
                            {gettext("Save as")}
                            <DownOutlined />
                        </Space>
                    </Button>
                </Dropdown>
            </Space.Compact>
        );
    }
);

PrintMapExport.displayName = "PrintMapExport";
