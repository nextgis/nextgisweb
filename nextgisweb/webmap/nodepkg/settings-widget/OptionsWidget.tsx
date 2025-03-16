import { sortBy } from "lodash-es";
import { observer } from "mobx-react-lite";
import { Fragment, useCallback, useMemo } from "react";

import { Select } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { SettingStore } from "./SettingStore";

import "./OptionsWidget.less";

const msgAuto = gettext("Auto");

function useSchema() {
    const { data } = useRouteGet("webmap.option.schema");
    return useMemo(() => {
        if (data === undefined) return undefined;
        const options = Object.values(data.options);
        return sortBy(Object.values(data.categories), ["order", "label"])
            .map((category) => ({
                ...category,
                options: sortBy(
                    options.filter(
                        ({ category: optionCategory }) =>
                            optionCategory === category.identity
                    ),
                    ["order", "label"]
                ),
            }))
            .filter(({ options }) => options.length > 0);
    }, [data]);
}

const optionSelectOptions = [
    { value: true, label: gettext("Yes") },
    { value: false, label: gettext("No") },
];

interface OptionSelectProps {
    store: SettingStore;
    identity: string;
}

const OptionSelect = observer<OptionSelectProps>(({ store, identity }) => {
    const onChange = useCallback(
        (value: boolean | undefined) => {
            store.setOption(identity, value);
        },
        [store, identity]
    );

    return (
        <Select<boolean | undefined, (typeof optionSelectOptions)[number]>
            variant="borderless"
            size="small"
            value={store.options[identity]}
            placeholder={msgAuto}
            allowClear={true}
            options={optionSelectOptions}
            onChange={onChange}
        />
    );
});

OptionSelect.displayName = "OptionSelect";

interface OptionsWidgetProps {
    store: SettingStore;
}

export const OptionsWidget = observer<OptionsWidgetProps>(({ store }) => {
    const schema = useSchema();

    return (
        <div className="ngw-webmap-settings-widget-options-widget">
            {schema !== undefined &&
                schema.map((c) => (
                    <Fragment key={c.identity}>
                        <div className="category">{c.label}</div>
                        {c.options.map((o) => (
                            <Fragment key={o.identity}>
                                <label>{o.label}</label>
                                <OptionSelect
                                    store={store}
                                    identity={o.identity}
                                />
                            </Fragment>
                        ))}
                    </Fragment>
                ))}
        </div>
    );
});

OptionsWidget.displayName = "OptionsWidget";
