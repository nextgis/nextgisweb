import { useCallback, useEffect, useMemo, useState } from "react";
import type { FC } from "react";

import { InputNumber, Select } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { Display } from "@nextgisweb/webmap/display";
import type { PrintMapSettings } from "@nextgisweb/webmap/print-map/type";

import { pageFormats } from "../options";
import { getPrintUrlSettings } from "../util";

interface PrintPaperSettingsProps {
    display: Display;
    mapSettings: PrintMapSettings;
    updateMapSettings: (updateSettings: Partial<PrintMapSettings>) => void;
}

export const PrintPaperSettings: FC<PrintPaperSettingsProps> = ({
    display,
    mapSettings,
    updateMapSettings,
}) => {
    const [urlParsed, setUrlParsed] = useState(false);

    const [paperFormat, setPaperFormat] = useState("210_297");
    const [disableChangeSize, setDisableChangeSize] = useState(true);

    const printMaxSize = useMemo(() => {
        return display.config.printMaxSize;
    }, [display]);

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

    const validate = (value: unknown) => {
        return typeof value === "number";
    };

    return (
        <>
            <div className="input-group column">
                <label>{gettext("Paper format")}</label>
                <Select
                    style={{ width: "100%" }}
                    onChange={changePaperFormat}
                    value={paperFormat}
                    options={pageFormats}
                />
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
                />
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
                />
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
                />
            </div>
        </>
    );
};

PrintPaperSettings.displayName = "PrintPaperSettings";
