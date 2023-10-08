import { useEffect, useState } from "react";

import { ImageUploader } from "@nextgisweb/file-upload";
import type { UploaderMeta } from "@nextgisweb/file-upload/file-uploader";
import type { ImageUploaderProps } from "@nextgisweb/file-upload/image-uploader";
import { Space, message } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import { routeURL } from "@nextgisweb/pyramid/api";
import type { RouteName } from "@nextgisweb/pyramid/api/type";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { ApiError } from "../error/type";

interface ModelLogoFormProps extends ImageUploaderProps {
    model: RouteName;
    messages?: {
        saveSuccess?: string;
        helpText?: string;
        uploadText?: string;
        dragAndDropText?: string;
    };
}

const defaultMessages = {
    saveSuccess: gettext("Logo saved. Reload the page to get them applied."),
};

export function ModelLogoForm({
    model,
    messages = {},
    accept,
}: ModelLogoFormProps) {
    const [status, setStatus] = useState<"loading" | "saving" | null>(
        "loading"
    );
    const [logo, setLogo] = useState<Blob>();
    const [fileMeta, setFileMeta] = useState<UploaderMeta | null>(null);

    const msg = { ...defaultMessages, ...messages };

    useEffect(() => {
        const initLogo = async () => {
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
        };
        initLogo();
    }, [model]);

    const save = async () => {
        try {
            await fetch(routeURL(model), {
                method: "PUT",
                body: JSON.stringify(fileMeta),
            });
            message.success(msg.saveSuccess);
        } catch (err) {
            errorModal(err as ApiError);
        } finally {
            setStatus(null);
        }
    };

    if (status === "loading") {
        return <LoadingWrapper />;
    }

    return (
        <Space direction="vertical" style={{ width: "100%" }}>
            <ImageUploader
                helpText={msg.helpText}
                uploadText={msg.uploadText}
                dragAndDropText={msg.dragAndDropText}
                onChange={(meta?: UploaderMeta) => setFileMeta(meta || null)}
                image={logo}
                accept={accept}
            ></ImageUploader>
            <SaveButton onClick={save} loading={status === "saving"} />
        </Space>
    );
}
