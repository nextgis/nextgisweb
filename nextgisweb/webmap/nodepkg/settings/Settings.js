import { useEffect, useState } from "react";
import { route } from "@nextgisweb/pyramid/api";
import { errorModal } from "@nextgisweb/gui/error";
import { message } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import i18n from "@nextgisweb/pyramid/i18n!";
import { SettingsForm } from "./SettingsForm";

const ROUTE_WEBMAP_SETTINGS = route("webmap.settings");
const ROUTE_SRS = route("spatial_ref_sys.collection");

const loadSettings = async () => {
    const Settings = await ROUTE_WEBMAP_SETTINGS.get();
    const srsInfo = await ROUTE_SRS.get();
    return [Settings, srsInfo];
};

const saveSettings = async (settings) => {
    return await ROUTE_WEBMAP_SETTINGS.put({
        json: settings,
    });
};

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
    const [Settings, setSettings] = useState();

    async function load() {
        try {
            const [Settings, srsInfo] = await loadSettings();
            setSettings(Settings);
            setSrsOptions(srsListToOptions(srsInfo));
            setStatus("loaded");
        } catch (err) {
            errorModal(err);
        }
    }

    useEffect(() => load(), []);

    const onFinish = async (values) => {
        setStatus("saving");
        try {
            await saveSettings(values);
            setStatus("loaded");
            message.success(i18n.gettext("Settings saved"))
        } catch (err) {
            errorModal(err);
        }
    };

    if (status === "loading") {
        return <LoadingWrapper loading={true} />;
    }

    return (
        <SettingsForm
            initialValues={Settings}
            srsOptions={srsOptions}
            onFinish={onFinish}
            status={status}
        />
    );
}
