import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";

import { InputNumber, Select } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { Display } from "@nextgisweb/webmap/display";
import type { PrintMapStore } from "@nextgisweb/webmap/print-map/store";
import type { PrintMapSettings } from "@nextgisweb/webmap/print-map/type";

import { pageFormats } from "../options";
import { getPrintUrlSettings } from "../util";

interface PrintPaperSettingsProps {
    display: Display;
    printMapStore: PrintMapStore;
}

const calculateFormat = (urlSettings: Partial<PrintMapSettings>) => {
    return `${urlSettings.width}_${urlSettings.height}`;
};

export const PrintPaperSettings = observer<PrintPaperSettingsProps>(
    ({ display, printMapStore }) => {
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
                    printMapStore.update({
                        width,
                        height,
                    });
                }
            },
            [printMapStore]
        );

        useEffect(() => {
            if (!urlParsed) {
                const urlSettings = getPrintUrlSettings();

                const keysPaperSize: (keyof PrintMapSettings)[] = [
                    "height",
                    "width",
                ];
                if (keysPaperSize.every((k) => k in urlSettings)) {
                    const format = calculateFormat(urlSettings);
                    const pageFormat = pageFormats.find(
                        (f) => f.value === format
                    );
                    changePaperFormat(pageFormat?.value || "custom");
                } else {
                    keysPaperSize.forEach((k) => {
                        delete urlSettings[k];
                    });
                }

                printMapStore.update(urlSettings);
                setUrlParsed(true);
            }
        }, [changePaperFormat, printMapStore, urlParsed]);

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
                            printMapStore.update({ height: v || undefined })
                        }
                        value={printMapStore.height}
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
                            printMapStore.update({ width: v || undefined })
                        }
                        value={printMapStore.width}
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
                            validate(v) &&
                            printMapStore.update({ margin: v || 0 })
                        }
                        value={printMapStore.margin}
                        min={0}
                        step={1}
                    />
                </div>
            </>
        );
    }
);

PrintPaperSettings.displayName = "PrintPaperSettings";
