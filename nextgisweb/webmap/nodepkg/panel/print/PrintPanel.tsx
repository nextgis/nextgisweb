import { debounce } from "lodash-es";
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
import reactApp from "@nextgisweb/gui/react-app";
import { gettext } from "@nextgisweb/pyramid/i18n";
import PrintMap from "@nextgisweb/webmap/print-map";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Import URL parser module
import URL from "ngw-webmap/utils/URL";

import type { PrintMapSettings } from "../../print-map/type";
import type { DojoDisplay } from "../../type";
import { PanelHeader } from "../header";

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

import "../styles/panels.less";
import "./PrintPanel.less";

const { TextArea } = Input;

interface PrintMapCompProps {
    settings: PrintMapSettings;
    display: DojoDisplay;
    initCenter: Coordinate | null;
    onScaleChange: (scale: number) => void;
    onCenterChange: (center: Coordinate) => void;
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
    initCenter,
    onScaleChange,
    onCenterChange,
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
        { settings, display, initCenter, onScaleChange, onCenterChange },
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
    const parsed = URL.getURLParams() as Record<
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
    const parsed = URL.getURLParams();

    for (const [urlParam, settingInfo] of Object.entries(urlPrintParams)) {
        const { setting } = settingInfo;
        if (setting === undefined) {
            continue;
        }

        const mapSettingValue = mapSettings[setting];
        parsed[urlParam] = settingInfo.toParam
            ? settingInfo.toParam(mapSettingValue as never)
            : mapSettingValue;
    }

    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const urlWithoutParams = `${origin}${pathname}`;
    const queryString = new URLSearchParams(parsed).toString();

    return `${urlWithoutParams}?${queryString}`;
};

interface PrintPanelProps {
    display: DojoDisplay;
    title: string;
    close: () => void;
    visible: boolean;
}

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
    }, [customScale]);

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

export const PrintPanel = ({
    display,
    title,
    close,
    visible,
}: PrintPanelProps) => {
    const [urlParsed, setUrlParsed] = useState(false);
    const [mapInit, setMapInit] = useState(false);
    const [paperFormat, setPaperFormat] = useState("210_297");
    const [disableChangeSize, setDisableChangeSize] = useState(true);
    const [scales, setScales] = useState(scalesList);
    const [center, setCenter] = useState<Coordinate>();
    const [printMapScale, setPrintMapScale] = useState<number>();
    const [printMapComp, setPrintMapComp] = useState<Comp>();
    const [printMapEl, setPrintMapEl] = useState<HTMLElement>();

    const printMaxSize = useMemo(() => {
        return display.config.printMaxSize;
    }, [display]);

    const defaultSettings = useMemo(
        () => defaultPanelMapSettings(display.config.webmapTitle),
        [display.config.webmapTitle]
    );
    const [mapSettings, setMapSettings] =
        useState<PrintMapSettings>(defaultSettings);

    const resizeObserver = useRef<ResizeObserver>();

    const updateMapSettings = (updateSettings: Partial<PrintMapSettings>) => {
        const newMapSettings = { ...mapSettings, ...updateSettings };
        setMapSettings(newMapSettings);
    };

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

    if (!urlParsed) {
        const urlSettings = getPrintUrlSettings();

        const keysPaperSize: (keyof PrintMapSettings)[] = ["height", "width"];
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

    const getCenterFromUrl = (): Coordinate | null => {
        if (mapInit) {
            return null;
        }

        const urlSettings = getPrintUrlSettings();
        return urlSettings.center || null;
    };

    const show = () => {
        const {
            comp,
            element,
            resizeObserver: resize,
        } = makePrintMapComp({
            settings: mapSettings,
            display,
            initCenter: getCenterFromUrl(),
            onScaleChange: (scale: number) => {
                setPrintMapScale(scale);
            },
            onCenterChange: (center: Coordinate) => {
                setCenter(center);
            },
        });
        setPrintMapComp(comp);
        setPrintMapEl(element);
        resizeObserver.current = resize;
        setMapInit(true);
    };

    const hide = () => {
        setTimeout(() => {
            updateMapSettings({ scale: undefined });
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
        if (!center) {
            return;
        }
        updateMapSettings({ center: center });
    }, [center]);

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

    const validate = (value: unknown) => {
        return typeof value === "number";
    };

    return (
        <div className="ngw-panel print-panel">
            <PanelHeader {...{ title, close }} />

            <section>
                <div className="input-group column">
                    <label>{gettext("Paper format")}</label>
                    <Select
                        style={{ width: "100%" }}
                        onChange={(v) => changePaperFormat(v)}
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
            </section>

            <section>
                <h5 className="heading">{gettext("Elements")}</h5>
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

                <div className="input-group column">
                    <label>{gettext("Scale")}</label>
                    <ScalesSelect
                        selectedValue={mapSettings.scale}
                        scales={scales}
                        onChange={(v) => updateMapSettings({ scale: v })}
                    />
                </div>
            </section>

            <section>
                <div className="actions">
                    <PrintMapExport
                        display={display}
                        mapSettings={mapSettings}
                        printMapEl={printMapEl}
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
            </section>
        </div>
    );
};
