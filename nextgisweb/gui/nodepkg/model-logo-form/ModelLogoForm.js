import { ImageUploader } from "@nextgisweb/file-upload";
import { message, Space } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import ErrorDialog from "@nextgisweb/gui/error";
import { routeURL } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!";
import { PropTypes } from "prop-types";
import { useEffect, useState } from "react";

const defaultMessages = {
    saveSuccess: i18n.gettext(
        "Logo saved. Reload the page to get them applied."
    ),
};

export function ModelLogoForm({ model, messages = {}, accept }) {
    const [status, setStatus] = useState("loading");
    const [logo, setLogo] = useState(null);

    const msg = { ...defaultMessages, ...messages };

    useEffect(async () => {
        try {
            const resp = await fetch(routeURL(model));
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
            await fetch(routeURL(model), {
                method: "PUT",
                body: JSON.stringify(logo),
            });
            message.success(msg.saveSuccess);
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
                helpText={msg.helpText}
                uploadText={msg.uploadText}
                dragAndDropText={msg.dragAndDropText}
                onChange={setLogo}
                image={logo}
                accept={accept}
            ></ImageUploader>
            <SaveButton onClick={save} loading={status === "saving"} />
        </Space>
    );
}

ModelLogoForm.propTypes = {
    model: PropTypes.string.isRequired,
    messages: PropTypes.object,
};
