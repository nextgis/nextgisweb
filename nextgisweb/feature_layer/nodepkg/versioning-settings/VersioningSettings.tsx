import { useCallback, useEffect, useState } from "react";

import type {
    FeatureLayerCSettingsRead,
    FeatureLayerCSettingsUpdate,
} from "@nextgisweb/feature-layer/type/api";
import { message } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { VersioningForm } from "./VersioningForm";

export function VersioningSettings() {
    const [status, setStatus] = useState<string>("loading");
    const [settings, setSettings] = useState<FeatureLayerCSettingsRead>();
    const { makeSignal } = useAbortController();
    const [messageApi, contextHolder] = message.useMessage();

    useEffect(() => {
        async function load() {
            try {
                const signal = makeSignal();
                const csettings = await route("pyramid.csettings").get({
                    query: { feature_layer: ["all"] },
                    signal,
                });
                setSettings(csettings.feature_layer);
            } catch (err) {
                errorModal(err);
            } finally {
                setStatus("loaded");
            }
        }
        load();
    }, [makeSignal]);

    const onFinish = useCallback(
        async (values: FeatureLayerCSettingsUpdate) => {
            setStatus("saving");
            try {
                await route("pyramid.csettings").put({
                    json: { feature_layer: values },
                    signal: makeSignal(),
                });

                messageApi.success(gettext("Settings saved"));
            } catch (err) {
                errorModal(err);
            } finally {
                setStatus("loaded");
            }
        },
        [makeSignal, messageApi]
    );

    if (status === "loading") {
        return <LoadingWrapper loading={true} />;
    }

    return (
        <>
            {contextHolder}
            <VersioningForm
                initialValues={settings}
                onFinish={onFinish}
                status={status}
            />
        </>
    );
}
