import type { DataSource } from "../type";

export const getAttachmentKey = (source: DataSource): string =>
  "file_upload" in source ? source.file_upload.id : String(source.id);
