import { toPng } from "html-to-image";
import { useEffect, useRef, useState } from "react";

import {
    Button,
    Dropdown,
    InputNumber,
    Select,
    Space,
    Switch,
} from "@nextgisweb/gui/antd";
import type { MenuProps } from "@nextgisweb/gui/antd";
import { FloatingLabel } from "@nextgisweb/gui/floating-label";
import reactApp from "@nextgisweb/gui/react-app";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import PrintMap from "@nextgisweb/webmap/print-map";

import type { PrintMapSettings } from "../../print-map/PrintMap";
import type { DojoDisplay } from "../../type";
import { PanelHeader } from "../header";

import {
    exportFormats,
    pageFormats,
    scaleToLabel,
    scalesList,
} from "./options";

import { DownOutlined } from "@ant-design/icons";

import "./PrintPanel.less";

interface PrintMapCompProps {
    settings: PrintMapSettings;
    display: DojoDisplay;
    onScaleChange: (scale: number) => void;
}

type Comp = ReturnType<typeof reactApp<PrintMapCompProps>>;

interface PrintMapCompElements {
    comp: Comp;
    element: HTMLDivElement;
    resizeObserver: ResizeObserver;
}

const makePrintMapComp = ({
    settings,
    display,
    onScaleChange,
}: PrintMapCompProps): PrintMapCompElements => {
    const div = document.createElement("div");
    div.classList.add("print-map-pane");
    document.body.appendChild(div);

    const resizeObserver = new ResizeObserver((entries) => {
        const mapContainer = entries[0].target;
        const { left, top } = mapContainer.getBoundingClientRect();
        div.style.left = `${left}px`;
        div.style.top = `${top}px`;
    });

    resizeObserver.observe(display.mapContainer.domNode);

    const comp: ReturnType<typeof reactApp<PrintMapCompProps>> = reactApp(
        PrintMap,
        { settings, display, onScaleChange },
        div
    );
    return { comp, element: div, resizeObserver };
};

const updatePrintMapComp = (comp: Comp, settings: PrintMapSettings) => {
    if (!comp) {
        return;
    }
    comp.update({ settings });
};

const runExport = ({
    format,
    element,
    settings,
    setLoadingFile,
}: {
    format: string;
    element: HTMLElement;
    settings: PrintMapSettings;
    setLoadingFile: (loading: boolean) => void;
}) => {
    setLoadingFile(true);

    let toPngPromise;
    try {
        toPngPromise = toPng(element);
    } catch {
        setLoadingFile(false);
        return;
    }

    toPngPromise
        .then((dataUrl) => {
            const { width, height, margin } = settings;
            const body = {
                width,
                height,
                margin,
                map_image: dataUrl.substring("data:image/png;base64,".length),
                format: format,
            };

            route("webmap.print")
                .post({ json: body })
                .then((blob) => {
                    const file = window.URL.createObjectURL(blob as Blob);
                    const tab = window.open();
                    if (tab) {
                        tab.location.href = file;
                        setLoadingFile(false);
                    }
                })
                .finally(() => {
                    setLoadingFile(false);
                });
        })
        .catch(() => {
            setLoadingFile(false);
        });
};

const defaultPanelMapSettings: PrintMapSettings = {
    height: 297,
    width: 210,
    margin: 10,
    scale: undefined,
    scaleLine: false,
    scaleValue: false,
};

interface PrintPanelProps {
    display: DojoDisplay;
    title: string;
    close: () => void;
    visible: boolean;
}

export const PrintPanel = ({
    display,
    title,
    close,
    visible,
}: PrintPanelProps) => {
    const [mapSettings, setMapSettings] = useState<PrintMapSettings>(
        defaultPanelMapSettings
    );
    const [paperFormat, setPaperFormat] = useState("210_297");
    const [disableChangeSize, setDisableChangeSize] = useState(true);
    const [scales, setScales] = useState(scalesList);
    const [printMapScale, setPrintMapScale] = useState<number>();
    const [printMapComp, setPrintMapComp] = useState<Comp>();
    const [printMapEl, setPrintMapEl] = useState<HTMLElement>();
    const [loadingFile, setLoadingFile] = useState(false);

    const resizeObserver = useRef<ResizeObserver>();

    const updateMapSettings = (updateSettings: Partial<PrintMapSettings>) => {
        const newMapSettings = { ...mapSettings, ...updateSettings };
        setMapSettings(newMapSettings);
    };

    const show = () => {
        const {
            comp,
            element,
            resizeObserver: resize,
        } = makePrintMapComp({
            settings: mapSettings,
            display,
            onScaleChange: (scale: number) => {
                setPrintMapScale(scale);
            },
        });
        setPrintMapComp(comp);
        setPrintMapEl(element);
        resizeObserver.current = resize;
    };

    const hide = () => {
        setTimeout(() => {
            if (resizeObserver.current) {
                resizeObserver.current.disconnect();
            }
            if (printMapComp) {
                printMapComp.unmount();
            }
            setPrintMapComp(undefined);
            setPrintMapEl(undefined);
            if (printMapEl) {
                printMapEl.remove();
            }
        });
    };

    useEffect(() => {
        visible ? show() : hide();
    }, [visible]);

    useEffect(() => {
        if (printMapComp) {
            updatePrintMapComp(printMapComp, mapSettings);
        }
    }, [mapSettings]);

    useEffect(() => {
        if (!printMapScale) {
            return;
        }

        const scaleInList = scalesList.some((s) => s.value === printMapScale);
        if (scaleInList) {
            setScales(scalesList);
            return;
        }

        const customScale = {
            value: printMapScale,
            label: scaleToLabel(printMapScale),
            disabled: true,
        };

        const newScales = [customScale, ...scalesList];
        setScales(newScales);
        updateMapSettings({ scale: printMapScale });
    }, [printMapScale]);

    const changePaperFormat = (newPaperFormat: string) => {
        setPaperFormat(newPaperFormat);
        setDisableChangeSize(newPaperFormat !== "custom");
        if (newPaperFormat !== "custom") {
            const widthHeight = newPaperFormat.split("_");
            const width = parseInt(widthHeight[0], 10);
            const height = parseInt(widthHeight[1], 10);
            updateMapSettings({
                width,
                height,
            });
        }
    };

    const exportToFormat = (format: string) => {
        if (!printMapEl) {
            return;
        }
        const [viewport] = printMapEl.getElementsByClassName("ol-viewport");
        runExport({
            format,
            element: viewport as HTMLElement,
            settings: mapSettings,
            setLoadingFile,
        });
    };

    const exportFormatsProps: MenuProps = {
        items: exportFormats,
        onClick: (item) => {
            exportToFormat(item.key);
        },
    };

    const validate = (value: unknown) => {
        return typeof value === "number";
    };

    return (
        <div className="print-panel">
            <PanelHeader {...{ title, close }} />

            <section>
                <FloatingLabel
                    label={gettext("Paper format")}
                    value={paperFormat}
                >
                    <Select
                        style={{ width: "100%" }}
                        onChange={(v) => changePaperFormat(v)}
                        value={paperFormat}
                        options={pageFormats}
                    ></Select>
                </FloatingLabel>

                <FloatingLabel
                    label={gettext("Height, mm")}
                    value={String(mapSettings.height)}
                >
                    <InputNumber
                        style={{ width: "100%" }}
                        onChange={(v) =>
                            validate(v) &&
                            updateMapSettings({ height: v || undefined })
                        }
                        value={mapSettings.height}
                        min={5}
                        max={1000}
                        step={1}
                        disabled={disableChangeSize}
                    ></InputNumber>
                </FloatingLabel>

                <FloatingLabel
                    label={gettext("Width, mm")}
                    value={String(mapSettings.width)}
                >
                    <InputNumber
                        style={{ width: "100%" }}
                        onChange={(v) =>
                            validate(v) &&
                            updateMapSettings({ width: v || undefined })
                        }
                        value={mapSettings.width}
                        min={5}
                        max={1000}
                        step={1}
                        disabled={disableChangeSize}
                    ></InputNumber>
                </FloatingLabel>

                <FloatingLabel
                    label={gettext("Margin, mm")}
                    value={String(mapSettings.margin)}
                >
                    <InputNumber
                        style={{ width: "100%" }}
                        onChange={(v) =>
                            validate(v) &&
                            updateMapSettings({ margin: v || undefined })
                        }
                        value={mapSettings.margin}
                        min={0}
                        max={1000}
                        step={1}
                    ></InputNumber>
                </FloatingLabel>
            </section>

            <section>
                <h5 className="heading">{gettext("Scale")}</h5>
                <div className="input-group">
                    <Switch
                        checked={mapSettings.scaleValue}
                        onChange={(v) => updateMapSettings({ scaleValue: v })}
                    />
                    <span className="checkbox__label">
                        {gettext("Scale value")}
                    </span>
                </div>
                <div className="input-group">
                    <Switch
                        checked={mapSettings.scaleLine}
                        onChange={(v) => updateMapSettings({ scaleLine: v })}
                    />
                    <span className="checkbox__label">
                        {gettext("Scale bar")}
                    </span>
                </div>

                <FloatingLabel
                    label={gettext("Scale")}
                    value={String(mapSettings.scale)}
                >
                    <Select
                        style={{ width: "100%" }}
                        onChange={(v) => updateMapSettings({ scale: v })}
                        value={mapSettings.scale}
                        options={scales}
                    ></Select>
                </FloatingLabel>

                <Space.Compact>
                    <Button
                        type="primary"
                        onClick={() => {
                            window.print();
                        }}
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
            </section>
        </div>
    );
};
