import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Switch } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { PrintMapStore } from "@nextgisweb/webmap/print-map/store";
import type { PrintMapSettings } from "@nextgisweb/webmap/print-map/type";

import { ScalesSelect } from "../component/ScalesSelect";
import { scaleToLabel, scalesList } from "../options";
import type { Scale } from "../options";

interface PrintScaleSettings {
    printMapStore: PrintMapStore;
}

export const PrintScaleSettings = observer<PrintScaleSettings>(
    ({ printMapStore }) => {
        const [customScale, setCustomScale] = useState<Scale | null>(null);

        const { scale, scaleLine, scaleValue } = printMapStore;

        const scalesToShow = useMemo(() => {
            if (customScale) {
                return [customScale, ...scalesList];
            }
            return scalesList;
        }, [customScale]);

        const updateMapScale = useCallback(
            (scale: PrintMapSettings["scale"]) => {
                printMapStore.update({ scale });
            },
            [printMapStore]
        );

        useEffect(() => {
            if (!scale) {
                return;
            }

            const scaleInList = scalesList.some((s) => s.value === scale);
            if (scaleInList) {
                setCustomScale(null);
                return;
            }

            const newCustomScale = {
                value: scale,
                label: scaleToLabel(scale),
                disabled: true,
            };

            setCustomScale(newCustomScale);
        }, [scale]);

        return (
            <>
                <div className="input-group">
                    <Switch
                        size="small"
                        checked={scaleValue}
                        onChange={(v) =>
                            printMapStore.update({ scaleValue: v })
                        }
                    />
                    <span className="checkbox__label">
                        {gettext("Scale value")}
                    </span>
                </div>
                <div className="input-group">
                    <Switch
                        size="small"
                        checked={scaleLine}
                        onChange={(v) => printMapStore.update({ scaleLine: v })}
                    />
                    <span className="checkbox__label">
                        {gettext("Scale bar")}
                    </span>
                </div>

                <div className="input-group column">
                    <label>{gettext("Scale")}</label>
                    <ScalesSelect
                        value={scale}
                        scales={scalesToShow}
                        onChange={updateMapScale}
                    />
                </div>
            </>
        );
    }
);

PrintScaleSettings.displayName = "PrintScaleSettings";
