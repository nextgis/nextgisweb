import { observer } from "mobx-react-lite";

import { Checkbox, Select } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { annotation, editing } from "@nextgisweb/pyramid/settings!webmap";

import "./SettingsWidget.less";

const { Option } = Select;

const disabledStyle = {
    color: "rgba(0, 0, 0, 0.25)",
    cursor: "not-allowed",
};

export const SettingsWidget = observer(({ store }) => {
    return (
        <div className="ngw-webmap-settings-widget">
            <Checkbox
                disabled={!editing}
                checked={store.editable}
                onChange={(e) => {
                    store.update({ editable: e.target.checked });
                }}
            >
                {gettext("Enable layers editing")}
            </Checkbox>

            <Checkbox
                disabled={!annotation}
                checked={store.annotationEnabled}
                onChange={(e) => {
                    store.update({ annotationEnabled: e.target.checked });
                }}
            >
                {gettext("Enable annotations")}
            </Checkbox>

            <label style={!annotation ? disabledStyle : {}}>
                {gettext("Show annotations")}
            </label>
            <Select
                disabled={!annotation}
                value={store.annotationDefault}
                onChange={(v) => {
                    store.update({ annotationDefault: v });
                }}
                style={{ maxWidth: "15em" }}
            >
                <Option value="no">{gettext("No")}</Option>
                <Option value="yes">{gettext("Yes")}</Option>
                <Option value="messages">{gettext("With messages")}</Option>
            </Select>

            <label>{gettext("Legend")}</label>
            <Select
                value={store.legendSymbols}
                onChange={(v) => {
                    store.update({ legendSymbols: v });
                }}
                placeholder={gettext("Default")}
                allowClear={true}
                style={{ maxWidth: "15em" }}
            >
                <Option value="expand">{gettext("Expand")}</Option>
                <Option value="collapse">{gettext("Collapse")}</Option>
                <Option value="disable">{gettext("Disable")}</Option>
            </Select>
        </div>
    );
});

SettingsWidget.title = gettext("Settings");
SettingsWidget.order = 40;
