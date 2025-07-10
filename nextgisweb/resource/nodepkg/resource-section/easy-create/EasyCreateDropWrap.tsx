import { useCallback } from "react";

import { useFileUploader } from "@nextgisweb/file-upload";
import { useShowModal } from "@nextgisweb/gui";
import { message } from "@nextgisweb/gui/antd";
import { extractError } from "@nextgisweb/gui/error";
import topic from "@nextgisweb/webmap/compat/topic";

import { registry } from "./registry";

export function EasyCreateDropWrap({
    children,
    parent,
}: {
    children: React.ReactElement;
    parent: number;
}) {
    const { upload } = useFileUploader({});
    const { lazyModal, modalHolder } = useShowModal();
    const [messageApi, contextHolder] = message.useMessage();

    const onDrop = useCallback(
        async (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                const progress = lazyModal(
                    () => import("@nextgisweb/gui/progress-modal/ProgressModal")
                );
                const total = files.length;

                const plugins = registry.queryAll();
                const fileProgressMap = new Map<string, number>();

                const updateTotalProgress = () => {
                    let sum = 0;
                    for (const value of fileProgressMap.values()) {
                        sum += value;
                    }
                    const percent = Math.round((sum / total) * 100);
                    progress.update({ percent });
                };

                try {
                    for (const file of files) {
                        fileProgressMap.set(file.name, 0);

                        const match = plugins.find((plugin) =>
                            plugin.match(file)
                        );
                        if (match) {
                            const resp = await upload([file], {
                                onProgress: (e) => {
                                    if (e.type === "progress") {
                                        fileProgressMap.set(
                                            file.name,
                                            e.decimal
                                        );
                                        updateTotalProgress();
                                    }
                                },
                            });

                            if (resp) {
                                for (const fileMeta of resp) {
                                    try {
                                        const creator =
                                            await match.getCreator();
                                        const newChildren = await creator({
                                            file: fileMeta,
                                            parent,
                                        });
                                        topic.publish(
                                            "resource/composite/add",
                                            newChildren
                                        );
                                    } catch (er) {
                                        const error = extractError(er);
                                        messageApi.error(error.message);
                                    }
                                }
                            }
                            fileProgressMap.set(file.name, 1);
                            updateTotalProgress();
                        }
                    }
                } finally {
                    progress.destroy();
                }
            }
        },
        [lazyModal, messageApi, parent, upload]
    );

    return (
        <div
            className="table-drag"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
        >
            {modalHolder}
            {contextHolder}
            {children}
        </div>
    );
}
