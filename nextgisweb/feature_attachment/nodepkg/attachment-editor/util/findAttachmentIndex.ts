import { FileMeta } from "@nextgisweb/file-upload/file-uploader/type";

import type { DataSource, FileMetaToUpload } from "../type";

export const findAttachmentIndex = (
    meta: FileMeta | FileMetaToUpload,
    data: DataSource[]
) => {
    const rowId = "file_upload" in meta ? meta.file_upload.id : meta.id;
    return data.findIndex((a) => {
        if ("file_upload" in a) {
            return a.file_upload.id === rowId;
        }
        return a.id === rowId;
    });
};
