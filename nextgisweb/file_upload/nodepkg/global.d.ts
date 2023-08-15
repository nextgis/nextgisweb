interface FileUploaderSettings {
    maxSize: number;
    chunkSize: number;
}

declare module "@nextgisweb/pyramid/settings!file_upload" {
    const value: FileUploaderSettings;
    export = value;
}
