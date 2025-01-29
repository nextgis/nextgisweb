import { useCallback, useEffect, useState } from "react";
import type { FC } from "react";

import { Switch } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { PrintMapSettings } from "../../../print-map/type";
import { ScalesSelect } from "../component/ScalesSelect";
import { scaleToLabel, scalesList } from "../options";

interface PrintScaleSettings {
    printMapScale?: number;
    mapSettings: PrintMapSettings;
    updateMapSettings: (updateSettings: Partial<PrintMapSettings>) => void;
}

export const PrintScaleSettings: FC<PrintScaleSettings> = ({
    printMapScale,
    mapSettings,
    updateMapSettings,
}) => {
    const [scales, setScales] = useState(scalesList);

    const updateMapScale = useCallback(
        (scale: PrintMapSettings["scale"]) => {
            updateMapSettings({ scale });
        },
        [updateMapSettings]
    );

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

    return (
        <>
            <div className="input-group">
                <Switch
                    size="small"
                    checked={mapSettings.scaleValue}
                    onChange={(v) => updateMapSettings({ scaleValue: v })}
                />
                <span className="checkbox__label">
                    {gettext("Scale value")}
                </span>
            </div>
            <div className="input-group">
                <Switch
                    size="small"
                    checked={mapSettings.scaleLine}
                    onChange={(v) => updateMapSettings({ scaleLine: v })}
                />
                <span className="checkbox__label">{gettext("Scale bar")}</span>
            </div>

            <div className="input-group column">
                <label>{gettext("Scale")}</label>
                <ScalesSelect
                    selectedValue={mapSettings.scale}
                    scales={scales}
                    onChange={updateMapScale}
                />
            </div>
        </>
    );
};

PrintScaleSettings.displayName = "PrintScaleSettings";
