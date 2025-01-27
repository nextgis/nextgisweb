import type { FC } from "react";

import { Input, Select, Switch } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { PrintMapSettings } from "../../../print-map/type";
import { legendColumns } from "../options";

interface PrintElementsSettingsProps {
    mapSettings: PrintMapSettings;
    updateMapSettings: (updateSettings: Partial<PrintMapSettings>) => void;
}

const { TextArea } = Input;

export const PrintElementsSettings: FC<PrintElementsSettingsProps> = ({
    mapSettings,
    updateMapSettings,
}) => {
    return (
        <>
            <div className="input-group">
                <Switch
                    checked={mapSettings.legend}
                    onChange={(v) => updateMapSettings({ legend: v })}
                />
                <span className="checkbox__label">{gettext("Legend")}</span>
            </div>
            <div className="input-group">
                <Select
                    onChange={(v) => updateMapSettings({ legendColumns: v })}
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
        </>
    );
};
