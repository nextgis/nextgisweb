import { useEffect, useState } from "react";

import { ImageUploader } from "@nextgisweb/file-upload";
import type { UploaderMeta } from "@nextgisweb/file-upload/file-uploader";
import type { ImageUploaderProps } from "@nextgisweb/file-upload/image-uploader";
import { Space, message } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import type { KeysWithMethods } from "@nextgisweb/pyramid/api/type";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { ApiError } from "../error/type";

interface ModelLogoFormProps extends ImageUploaderProps {
    component: string;
    model: KeysWithMethods<["get", "put"]>;
    settingName: string;

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
    component,
    model,
    settingName,
    messages = {},
    accept = ".png, .svg",
}: ModelLogoFormProps) {
    const [status, setStatus] = useState<"loading" | "saving" | null>(
        "loading"
    );
    const [logo, setLogo] = useState<string>();
    const [fileMeta, setFileMeta] = useState<UploaderMeta | null>(null);

    const msg = { ...defaultMessages, ...messages };

    useEffect(() => {
        const initLogo = async () => {
            try {
                const resp = await route(model).get<
                    Record<string, Record<string, [string, string]>>
                >({
                    query: {
                        [component]: settingName,
                    },
                });
                if (resp[component][settingName]) {
                    const [mimeType, file] = resp[component][settingName];
                    setLogo(`data:${mimeType};base64,` + file);
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
    }, [component, model, settingName]);

    const save = async () => {
        try {
            await route(model).put({
                json: {
                    [component]: {
                        [settingName]: fileMeta,
                    },
                },
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
