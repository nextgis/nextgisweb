import { useEffect, useState } from "react";

import { message } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { SettingsForm } from "./SettingsForm";

const srsListToOptions = (srsList) => {
    return srsList.map((srs) => {
        return {
            label: srs.display_name,
            value: srs.id,
        };
    });
};

export function Settings() {
    const [status, setStatus] = useState("loading");
    const [srsOptions, setSrsOptions] = useState([]);
    const [settings, setSettings] = useState();

    async function load() {
        try {
            const [csettings, srsInfo] = await Promise.all([
                route("pyramid.csettings").get({ query: { "webmap": "all" } }),
                route("spatial_ref_sys.collection").get(),
            ]);
            setSettings(csettings.webmap);
            setSrsOptions(srsListToOptions(srsInfo));
            setStatus("loaded");
        } catch (err) {
            errorModal(err);
        }
    }

    useEffect(() => {
        load();
    }, []);

    const onFinish = async (values) => {
        setStatus("saving");
        try {
            await route("pyramid.csettings").put({ json: { webmap: values } });
            setStatus("loaded");
            message.success(gettext("Settings saved"));
        } catch (err) {
            errorModal(err);
        }
    };

    if (status === "loading") {
        return <LoadingWrapper loading={true} />;
    }

    return (
        <SettingsForm
            initialValues={settings}
            srsOptions={srsOptions}
            onFinish={onFinish}
            status={status}
        />
    );
}
