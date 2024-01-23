import { observer } from "mobx-react-lite";

import { Checkbox } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import "./SettingsWidget.less";

export const SettingsWidget = observer(({ store }) => {
    return (
        <div className="ngw-feature-layer-settings-widget">
            <Checkbox
                checked={store.versioningEnabled}
                onChange={(e) => {
                    store.update({ versioningEnabled: e.target.checked });
                }}
            >
                {gettext("Enable feature versioning")}
            </Checkbox>
        </div>
    );
});

SettingsWidget.title = gettext("Settings");
SettingsWidget.order = 40;
