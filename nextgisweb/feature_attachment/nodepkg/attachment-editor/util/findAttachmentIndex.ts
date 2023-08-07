import type { DataSource } from "../type";

export const findAttachmentIndex = (
    meta: DataSource,
    data: DataSource[]
): number => {
    const rowId = "file_upload" in meta ? meta.file_upload.id : meta.id;
    return data.findIndex((a) => {
        if ("file_upload" in a) {
            return a.file_upload.id === rowId;
        }
        return a.id === rowId;
    });
};
