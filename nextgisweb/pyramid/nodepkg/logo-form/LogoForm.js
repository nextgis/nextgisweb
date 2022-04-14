import { message, Space } from "@nextgisweb/gui/antd";
import {
    ImageUploader,
    LoadingWrapper,
    SaveButton
} from "@nextgisweb/gui/component";
import ErrorDialog from "@nextgisweb/gui/error";
import { routeURL } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!pyramid";
import { useEffect, useState } from "react";

const helpText = i18n.gettext(
    "We recommend height of 45 px and width of up to 200 px."
);

export function LogoForm() {
    const [status, setStatus] = useState("loading");
    const [logo, setLogo] = useState(null);

    useEffect(async () => {
        try {
            const resp = await fetch(routeURL("pyramid.logo"));
            if (resp.ok) {
                const existLogo = await resp.blob();
                setLogo(existLogo);
            } else {
                throw new Error("The logo is not set");
            }
        } catch (err) {
            // ignore error
        } finally {
            setStatus(null);
        }
    }, []);

    const save = async () => {
        try {
            await fetch(routeURL("pyramid.logo"), {
                method: "PUT",
                body: JSON.stringify(logo),
            });
            message.success(
                i18n.gettext("Logo saved. Reload the page to get them applied.")
            );
        } catch (err) {
            new ErrorDialog(err).show();
        } finally {
            setStatus(null);
        }
    };

    if (status == "loading") {
        return <LoadingWrapper />;
    }

    return (
        <Space direction="vertical" style={{ width: "100%" }}>
            <ImageUploader
                helpText={helpText}
                onChange={setLogo}
                image={logo}
            ></ImageUploader>
            <SaveButton onClick={save} loading={status === "saving"} />
        </Space>
    );
}
