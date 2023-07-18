interface Chunksize {
    default: number;
    minimum: number;
}

interface Tus {
    enabled: boolean;
    chunk_size: Chunksize;
}

interface FileUploaderSettings {
    max_size: number;
    tus: Tus;
}

declare module "@nextgisweb/pyramid/settings!file_upload" {
    const value: FileUploaderSettings;
    export = value;
}
