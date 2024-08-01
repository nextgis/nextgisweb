import { useState } from "react";

import { FileUploader } from "@nextgisweb/file-upload/file-uploader";
import type { FileMeta } from "@nextgisweb/file-upload/file-uploader";
import { List, message } from "@nextgisweb/gui/antd";
import { SaveButton } from "@nextgisweb/gui/component";

import { route } from "../api";

export function FontsPanel({ items }: { items: string[] }) {
    const [fileMeta, setFileMeta] = useState<FileMeta | null>(null);

    const save = async () => {
        try {
            const resp = await route("pyramid.fonts").put({
                json: {
                    file_meta: fileMeta,
                },
            });

        } catch {
            //ignore
        } finally {
            setFileMeta(null);
            window.location.reload();
        }
    };

    return (
        <div>
            <List
                dataSource={items.sort()}
                renderItem={(item) => <List.Item>{item}</List.Item>}
            />
            <FileUploader
                accept=".ttf,.otf"
                onChange={(meta?: FileMeta) => {
                    if (meta) setFileMeta(meta);
                }}
            />
            <SaveButton onClick={save} disabled={fileMeta === null} />
        </div>
    );
}
