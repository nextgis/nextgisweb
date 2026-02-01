import { useCallback, useEffect, useState } from "react";

import { Radio, Space, message } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import { assert } from "@nextgisweb/jsrealm/error";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";

// prettier-ignore
const msg = {
    info: gettext("Select the default feature versioning setting for new layers. This affects layers created via UI and HTTP API. You can always change the versioning setting for individual layers later."),
    auto: gettext("Auto: follow system-wide settings"),
    true: gettext("Enable feature versioning by default"),
    false: gettext("Disable feature versioning by default"),
};

export function VersioningSettings() {
    const [value, setValue] = useState<boolean | null>();
    const { makeSignal } = useAbortController();
    const [saving, setSaving] = useState(false);

    const { data, isLoading } = useRouteGet({
        name: "pyramid.csettings",
        options: { query: { feature_layer: ["versioning_default"] } },
    });

    useEffect(() => {
        if (!data) return;
        const newValue = data.feature_layer?.versioning_default;
        assert(newValue !== undefined);
        setValue(newValue);
    }, [data]);

    const [messageApi, contextHolder] = message.useMessage();

    const save = useCallback(async () => {
        setSaving(true);
        try {
            await route("pyramid.csettings").put({
                json: { feature_layer: { versioning_default: value } },
                signal: makeSignal(),
            });
            messageApi.success(gettext("The setting is saved."));
        } catch (err) {
            errorModal(err);
        } finally {
            setSaving(false);
        }
    }, [value, makeSignal, messageApi]);

    if (isLoading) {
        return <LoadingWrapper />;
    }

    return (
        <Space direction="vertical" size="middle">
            {contextHolder}
            <div style={{ maxWidth: "50em" }}>{msg.info}</div>
            <Radio.Group
                value={String(value)}
                onChange={(e) => setValue(eval(e.target.value))}
            >
                <Space direction="vertical">
                    <Radio value="null">{msg.auto}</Radio>
                    <Radio value="true">{msg.true}</Radio>
                    <Radio value="false">{msg.false}</Radio>
                </Space>
            </Radio.Group>
            <SaveButton onClick={save} loading={saving}>
                {gettext("Save")}
            </SaveButton>
        </Space>
    );
}
