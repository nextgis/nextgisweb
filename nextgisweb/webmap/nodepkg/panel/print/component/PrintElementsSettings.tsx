import { observer } from "mobx-react-lite";

import { Input, Select, Switch } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { PrintMapStore } from "@nextgisweb/webmap/print-map/store";

import { legendColumns } from "../options";

interface PrintElementsSettingsProps {
    printMapStore: PrintMapStore;
}

const { TextArea } = Input;

export const PrintElementsSettings = observer<PrintElementsSettingsProps>(
    ({ printMapStore }) => {
        return (
            <>
                <div className="input-group">
                    <Switch
                        size="small"
                        checked={printMapStore.legend}
                        onChange={(v) => printMapStore.update({ legend: v })}
                    />
                    <span className="checkbox__label">{gettext("Legend")}</span>
                </div>
                <div className="input-group">
                    <Select
                        onChange={(v) =>
                            printMapStore.update({ legendColumns: v })
                        }
                        value={printMapStore.legendColumns}
                        options={legendColumns}
                        size="small"
                        disabled={!printMapStore.legend}
                    ></Select>
                    <span className="checkbox__label">
                        {gettext("Number of legend columns")}
                    </span>
                </div>

                <div className="input-group">
                    <Switch
                        size="small"
                        checked={printMapStore.title}
                        onChange={(v) => printMapStore.update({ title: v })}
                    />
                    <span className="checkbox__label">{gettext("Title")}</span>
                </div>
                <div className="input-group column">
                    <label>{gettext("Map title text")}</label>
                    <TextArea
                        onChange={(e) =>
                            printMapStore.update({ titleText: e.target.value })
                        }
                        rows={2}
                        value={printMapStore.titleText}
                        size="small"
                        disabled={!printMapStore.title}
                    ></TextArea>
                </div>

                <div className="input-group">
                    <Switch
                        size="small"
                        checked={printMapStore.arrow}
                        onChange={(v) => printMapStore.update({ arrow: v })}
                    />
                    <span className="checkbox__label">
                        {gettext("North Arrow")}
                    </span>
                </div>
                {/* <div className="input-group">
                    <Switch
                        size="small"
                        checked={printMapStore.graticule}
                        onChange={(v) => printMapStore.update({ graticule: v })}
                    />
                    <span className="checkbox__label">
                        {gettext("Graticule")}
                    </span>
                </div> */}
            </>
        );
    }
);

PrintElementsSettings.displayName = "PrintElementsSettings";
