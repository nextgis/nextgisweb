import { debounce } from "lodash-es";
import { observer } from "mobx-react-lite";
import type { Coordinate } from "ol/coordinate";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import {
    Divider,
    Input,
    InputNumber,
    Select,
    Space,
    Switch,
} from "@nextgisweb/gui/antd";
import { CopyToClipboardButton } from "@nextgisweb/gui/buttons";
import { useObjectState } from "@nextgisweb/gui/hook";
import reactApp from "@nextgisweb/gui/react-app";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { Display } from "@nextgisweb/webmap/display";
import PrintMap from "@nextgisweb/webmap/print-map";
import { getURLParams } from "@nextgisweb/webmap/utils/URL";

import type { PrintMapSettings } from "../../print-map/type";
import { PanelContainer, PanelSection } from "../component";
import type { PanelWidget } from "..";

import PrintMapExport from "./PrintMapExport";
import {
    legendColumns,
    pageFormats,
    scaleToLabel,
    scalesList,
    urlPrintParams,
} from "./options";
import type { Scale, UrlPrintParams } from "./options";

import { ShareAltOutlined } from "@ant-design/icons";

import "./PrintPanel.less";

const { TextArea } = Input;

interface PrintMapCompProps {
    settings: PrintMapSettings;
    display: Display;
    getCenterFromUrl: () => Coordinate | null;
    onScaleChange: (scale: number) => void;
    onCenterChange: (center: Coordinate) => void;
}

type Comp = ReturnType<typeof reactApp<PrintMapCompProps>>;

const usePrintMap = ({
    settings,
    display,
    getCenterFromUrl,
    onScaleChange,
    onCenterChange,
}: PrintMapCompProps) => {
    const resizeObserver = useRef<ResizeObserver>();
    const printMapComp = useRef<Comp>();
    const printMapEl = useRef<HTMLElement>();

    const destroy = useCallback(() => {
        // Schedule cleanup to avoid synchronous unmounting
        setTimeout(() => {
            if (resizeObserver.current) {
                resizeObserver.current.disconnect();
                resizeObserver.current = undefined;
            }
            if (printMapComp.current) {
                printMapComp.current.unmount();
                printMapComp.current = undefined;
            }
            if (printMapEl.current) {
                printMapEl.current.remove();
                printMapEl.current = undefined;
            }
        }, 0);
    }, []);

    const createPrintMapComp = useCallback(() => {
        if (!display.mapNode) {
            throw new Error("Display is not started yet!");
        }

        const div = document.createElement("div");
        div.classList.add("print-map-pane");
        document.body.appendChild(div);

        const resizeObserver_ = new ResizeObserver((entries) => {
            const mapContainer = entries[0].target;
            const { left, top } = mapContainer.getBoundingClientRect();
            div.style.left = `${left}px`;
            div.style.top = `${top}px`;
        });

        resizeObserver_.observe(display.mapNode);

        const comp: ReturnType<typeof reactApp<PrintMapCompProps>> = reactApp(
            PrintMap,
            {
                settings,
                display,
                initCenter: getCenterFromUrl(),
                onScaleChange,
                onCenterChange,
            },
            div
        );

        resizeObserver.current = resizeObserver_;
        printMapComp.current = comp;
        printMapEl.current = div;
    }, [display, getCenterFromUrl, onCenterChange, onScaleChange, settings]);

    useEffect(() => {
        if (printMapComp.current) {
            printMapComp.current.update({ settings });
        }
    }, [settings]);

    useEffect(() => {
        return () => {
            destroy();
        };
    }, [destroy]);

    return {
        createPrintMapComp,
        resizeObserver,
        printMapComp,
        printMapEl,
        destroy,
    };
};

const defaultPanelMapSettings = (initTitleText: string): PrintMapSettings => {
    return {
        height: 297,
        width: 210,
        margin: 10,
        scale: undefined,
        scaleLine: false,
        scaleValue: false,
        legend: false,
        legendColumns: 1,
        arrow: false,
        title: undefined,
        titleText: initTitleText,
    };
};

const getPrintUrlSettings = (): Partial<PrintMapSettings> => {
    const parsed = getURLParams() as Record<
        keyof UrlPrintParams<PrintMapSettings>,
        string
    >;

    const settingsUrl: Record<string, unknown> = {};
    for (const [urlParam, urlValue] of Object.entries(parsed) as [
        keyof UrlPrintParams<PrintMapSettings>,
        string,
    ][]) {
        if (!(urlParam in urlPrintParams) || urlValue === null) {
            continue;
        }
        const { fromParam, setting } = urlPrintParams[urlParam];

        if (setting === undefined || !fromParam) {
            continue;
        }

        const value = fromParam(urlValue);
        if (value === undefined) {
            continue;
        }
        settingsUrl[setting] = value as PrintMapSettings[typeof setting];
    }
    return settingsUrl as Partial<PrintMapSettings>;
};

const getPrintMapLink = (mapSettings: PrintMapSettings): string => {
    const parsed: Record<string, string> = getURLParams<PrintMapSettings>();

    for (const [urlParam, settingInfo] of Object.entries(urlPrintParams)) {
        const { setting } = settingInfo;
        if (setting === undefined) {
            continue;
        }

        const mapSettingValue = mapSettings[setting];
        parsed[urlParam] = String(
            settingInfo.toParam
                ? settingInfo.toParam(mapSettingValue as never)
                : mapSettingValue
        );
    }

    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const urlWithoutParams = `${origin}${pathname}`;
    const queryString = new URLSearchParams(parsed).toString();

    return `${urlWithoutParams}?${queryString}`;
};

interface ScalesSelectProps {
    selectedValue: number | undefined;
    scales: Scale[];
    onChange: (scale: number) => void;
}

const numberFormat = new Intl.NumberFormat("ru-RU");
const validateCustomScale = (value: number | null) =>
    value && Number.isInteger(value) && value > 0;

const ScalesSelect = ({
    selectedValue,
    scales,
    onChange,
}: ScalesSelectProps) => {
    const [customScale, setCustomScale] = useState<number | null>(null);
    const [open, setOpen] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (customScale === null) return;
        onChange(customScale);
    }, [customScale, onChange]);

    const changeCustomScale = useCallback((value: number | null) => {
        setCustomScale(validateCustomScale(value) ? value : null);
    }, []);

    const debouncedOnChange = debounce(changeCustomScale, 500);

    const onPressEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const inputValue = (e.target as HTMLInputElement)?.value.replace(
            /\s/g,
            ""
        );
        changeCustomScale(Number(inputValue));
        if (customScale && selectedValue !== customScale) onChange(customScale);
    };

    const onVisibleChange = (open: boolean) => {
        setOpen(open);
    };

    useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open, inputRef]);

    const dropdownRender = (menu: ReactNode) => (
        <>
            {menu}
            <Divider style={{ margin: "5px 0" }} />
            <div className="custom-scale">
                <div className="prefix">1 : </div>
                <div className="input">
                    <InputNumber
                        ref={inputRef}
                        min={1}
                        max={1000000000}
                        placeholder={gettext("Custom scale")}
                        value={customScale}
                        onChange={(v) => debouncedOnChange(v)}
                        formatter={(value) => {
                            if (!value) return "";
                            return numberFormat.format(value);
                        }}
                        onPressEnter={onPressEnter}
                        style={{ width: "100%" }}
                    />
                </div>
            </div>
        </>
    );

    return (
        <Select
            style={{ width: "100%" }}
            dropdownRender={dropdownRender}
            onChange={onChange}
            onDropdownVisibleChange={onVisibleChange}
            value={selectedValue}
            options={scales}
        ></Select>
    );
};

const PrintPanel: PanelWidget = observer(({ store, display }) => {
    const [urlParsed, setUrlParsed] = useState(false);
    const mapInit = useRef(false);
    const [paperFormat, setPaperFormat] = useState("210_297");
    const [disableChangeSize, setDisableChangeSize] = useState(true);
    const [scales, setScales] = useState(scalesList);
    const [center, setCenter] = useState<Coordinate>();
    const [printMapScale, setPrintMapScale] = useState<number>();

    const printMaxSize = useMemo(() => {
        return display.config.printMaxSize;
    }, [display]);

    const visible = useMemo(() => {
        return display.panelManager.activePanelName === store.name;
    }, [display.panelManager.activePanelName, store.name]);

    const [mapSettings, setMapSettings] = useObjectState<PrintMapSettings>(() =>
        defaultPanelMapSettings(display.config.webmapTitle)
    );

    const updateMapSettings = useCallback(
        (updateSettings: Partial<PrintMapSettings>) => {
            setMapSettings((old) => ({ ...old, ...updateSettings }));
        },
        [setMapSettings]
    );
    const updateMapScale = useCallback(
        (scale: PrintMapSettings["scale"]) => {
            setMapSettings((old) => ({ ...old, scale }));
        },
        [setMapSettings]
    );

    const changePaperFormat = useCallback(
        (newPaperFormat: string) => {
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
        },
        [updateMapSettings]
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

    useEffect(() => {
        if (!urlParsed) {
            const urlSettings = getPrintUrlSettings();

            const keysPaperSize: (keyof PrintMapSettings)[] = [
                "height",
                "width",
            ];
            if (keysPaperSize.every((k) => k in urlSettings)) {
                changePaperFormat("custom");
            } else {
                keysPaperSize.forEach((k) => {
                    delete urlSettings[k];
                });
            }

            updateMapSettings(urlSettings);
            setUrlParsed(true);
        }
    }, [changePaperFormat, updateMapSettings, urlParsed]);

    const show = useCallback(() => {
        if (!mapInit.current) {
            createPrintMapComp();

            mapInit.current = true;
        }
    }, [createPrintMapComp]);

    // const hide = useCallback(() => {
    //     updateMapSettings({ scale: undefined });
    // }, [updateMapSettings]);
    const hide = useCallback(() => {
        if (mapInit.current) {
            destroy();
            mapInit.current = false;
        }
    }, [destroy]);

    useEffect(() => {
        visible ? show() : hide();
    }, [hide, show, visible]);

    useEffect(() => {
        if (!center) {
            return;
        }
        updateMapSettings({ center: center });
    }, [center, updateMapSettings]);

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
    }, [printMapScale, updateMapSettings]);

    const validate = (value: unknown) => {
        return typeof value === "number";
    };

    return (
        <PanelContainer title={store.title} close={store.close}>
            <PanelSection>
                <div className="input-group column">
                    <label>{gettext("Paper format")}</label>
                    <Select
                        style={{ width: "100%" }}
                        onChange={changePaperFormat}
                        value={paperFormat}
                        options={pageFormats}
                    ></Select>
                </div>

                <div className="input-group column">
                    <label>{gettext("Height, mm")}</label>
                    <InputNumber
                        style={{ width: "100%" }}
                        onChange={(v) =>
                            validate(v) &&
                            updateMapSettings({ height: v || undefined })
                        }
                        value={mapSettings.height}
                        min={5}
                        max={printMaxSize}
                        step={1}
                        disabled={disableChangeSize}
                    ></InputNumber>
                </div>

                <div className="input-group column">
                    <label>{gettext("Width, mm")}</label>
                    <InputNumber
                        style={{ width: "100%" }}
                        onChange={(v) =>
                            validate(v) &&
                            updateMapSettings({ width: v || undefined })
                        }
                        value={mapSettings.width}
                        min={5}
                        max={printMaxSize}
                        step={1}
                        disabled={disableChangeSize}
                    ></InputNumber>
                </div>

                <div className="input-group column">
                    <label>{gettext("Margin, mm")}</label>
                    <InputNumber
                        style={{ width: "100%" }}
                        onChange={(v) =>
                            validate(v) && updateMapSettings({ margin: v || 0 })
                        }
                        value={mapSettings.margin}
                        min={0}
                        step={1}
                    ></InputNumber>
                </div>
            </PanelSection>

            <PanelSection title={gettext("Elements")}>
                <div className="input-group">
                    <Switch
                        checked={mapSettings.legend}
                        onChange={(v) => updateMapSettings({ legend: v })}
                    />
                    <span className="checkbox__label">{gettext("Legend")}</span>
                </div>
                <div className="input-group">
                    <Select
                        onChange={(v) =>
                            updateMapSettings({ legendColumns: v })
                        }
                        value={mapSettings.legendColumns}
                        options={legendColumns}
                        size="small"
                        disabled={!mapSettings.legend}
                    ></Select>
                    <span className="checkbox__label">
                        {gettext("Number of legend columns")}
                    </span>
                </div>

                <div className="input-group">
                    <Switch
                        checked={mapSettings.title}
                        onChange={(v) => updateMapSettings({ title: v })}
                    />
                    <span className="checkbox__label">{gettext("Title")}</span>
                </div>
                <div className="input-group column">
                    <label>{gettext("Map title text")}</label>
                    <TextArea
                        onChange={(e) =>
                            updateMapSettings({ titleText: e.target.value })
                        }
                        rows={2}
                        value={mapSettings.titleText}
                        size="small"
                        disabled={!mapSettings.title}
                    ></TextArea>
                </div>

                <div className="input-group">
                    <Switch
                        checked={mapSettings.arrow}
                        onChange={(v) => updateMapSettings({ arrow: v })}
                    />
                    <span className="checkbox__label">
                        {gettext("North Arrow")}
                    </span>
                </div>
            </PanelSection>

            <PanelSection title={gettext("Scale")}>
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

                <div className="input-group column">
                    <label>{gettext("Scale")}</label>
                    <ScalesSelect
                        selectedValue={mapSettings.scale}
                        scales={scales}
                        onChange={updateMapScale}
                    />
                </div>
            </PanelSection>

            <PanelSection>
                <div className="actions">
                    <PrintMapExport
                        display={display}
                        mapSettings={mapSettings}
                        printMapEl={printMapEl.current}
                    />
                    <Space.Compact>
                        <CopyToClipboardButton
                            type="link"
                            getTextToCopy={() => getPrintMapLink(mapSettings)}
                            icon={<ShareAltOutlined />}
                            title={gettext("Copy link to the print map")}
                            iconOnly
                        ></CopyToClipboardButton>
                    </Space.Compact>
                </div>
            </PanelSection>
        </PanelContainer>
    );
});

PrintPanel.displayName = "PrintPanel";
export default PrintPanel;
