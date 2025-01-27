import { useCallback, useEffect, useState } from "react";

import { message } from "@nextgisweb/gui/antd";
import type { OptionType } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { SRSRead } from "@nextgisweb/spatial-ref-sys/type/api";
import type {
    WebMapCSettingsRead,
    WebMapCSettingsUpdate,
} from "@nextgisweb/webmap/type/api";

import { SettingsForm } from "./SettingsForm";

const srsListToOptions = (srsList: SRSRead[]): OptionType[] =>
    srsList.map((srs) => ({
        label: srs.display_name,
        value: srs.id,
    }));

export function Settings() {
    const [status, setStatus] = useState<string>("loading");
    const [srsOptions, setSrsOptions] = useState<OptionType[]>([]);
    const [settings, setSettings] = useState<WebMapCSettingsRead>();
    const { makeSignal } = useAbortController();
    const [messageApi, contextHolder] = message.useMessage();

    useEffect(() => {
        async function load() {
            try {
                const signal = makeSignal();
                const [csettings, srsInfo] = await Promise.all([
                    route("pyramid.csettings").get({
                        query: { webmap: ["all"] },
                        signal,
                    }),
                    route("spatial_ref_sys.collection").get({ signal }),
                ]);
                setSettings(csettings.webmap);
                setSrsOptions(srsListToOptions(srsInfo));
            } catch (err) {
                errorModal(err as ApiError);
            } finally {
                setStatus("loaded");
            }
        }
        load();
    }, [makeSignal]);

    const onFinish = useCallback(
        async (values: WebMapCSettingsUpdate) => {
            setStatus("saving");
            try {
                await route("pyramid.csettings").put({
                    json: { webmap: values },
                    signal: makeSignal(),
                });

                messageApi.success(gettext("Settings saved"));
            } catch (err) {
                errorModal(err as ApiError);
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
            <SettingsForm
                initialValues={settings}
                srsOptions={srsOptions}
                onFinish={onFinish}
                status={status}
            />
        </>
    );
}
