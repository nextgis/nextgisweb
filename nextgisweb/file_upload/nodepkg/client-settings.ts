import { fetchSettings } from "@nextgisweb/pyramid/settings";

export interface FileUploadSettings {
    maxSize: number;
    chunkSize: number;
}

export default await fetchSettings<FileUploadSettings>(COMP_ID);
