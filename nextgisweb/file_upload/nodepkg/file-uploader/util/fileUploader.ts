import { Upload, isSupported } from "tus-js-client";

import settings from "@nextgisweb/file-upload/client-settings";
import { makeAbortError } from "@nextgisweb/gui/error/util";
import { BaseAPIError, routeURL } from "@nextgisweb/pyramid/api";

import type { FileMeta, FileUploaderOptions } from "../type";

async function upload({
    files,
    onProgress,
    signal,
}: FileUploaderOptions): Promise<FileMeta[]> {
    return new Promise((resolve, reject) => {
        const data = new FormData();
        for (const file of files) {
            data.append("file", file);
        }
        const xhr = new XMLHttpRequest();
        xhr.open("POST", routeURL("file_upload.collection"));
        xhr.onprogress = (e) => {
            if (onProgress) {
                const decimal = e.loaded / e.total;
                const percent = (100 * decimal).toFixed(0) + "%";
                onProgress({
                    type: "progress",
                    decimal,
                    percent,
                });
            }
        };
        xhr.onload = () => {
            resolve(JSON.parse(xhr.response).upload_meta);
        };
        xhr.onerror = (err) => {
            reject(err);
        };
        if (signal) {
            signal.addEventListener("abort", () => {
                xhr.abort();
                reject(makeAbortError());
            });
        }
        xhr.send(data);
    });
}

async function tusUpload({
    files,
    onProgress,
    signal,
}: FileUploaderOptions): Promise<FileMeta[]> {
    const result: FileMeta[] = [];

    let totalFilesSize = 0;
    let alreadyUploadedSize = 0;

    for (const file of files) {
        totalFilesSize += file.size;
        let progressFileSize = 0;
        const data = await new Promise<FileMeta>((resolve, reject) => {
            const uploader = new Upload(file, {
                endpoint: routeURL("file_upload.collection"),
                storeFingerprintForResuming: false,
                chunkSize: settings.chunkSize,
                metadata: { name: file.name },
                onProgress: (bytesUploaded) => {
                    if (onProgress) {
                        progressFileSize = bytesUploaded;
                        const decimal =
                            (alreadyUploadedSize + progressFileSize) /
                            totalFilesSize;
                        const percent = (100 * decimal).toFixed(0) + "%";
                        onProgress({
                            type: "progress",
                            decimal,
                            percent,
                        });
                    }
                },
                onError: (error) => {
                    if ("originalResponse" in error && error.originalResponse) {
                        const response = error.originalResponse;
                        const respHeader = response.getHeader("Content-Type");
                        if (respHeader === "application/json") {
                            error = JSON.parse(response.getBody());
                        }
                        reject(error);
                    }
                    reject(new BaseAPIError());
                },
                onSuccess: () => {
                    alreadyUploadedSize += progressFileSize;
                    const url_ = uploader.url;
                    if (url_) {
                        fetch(url_, { signal })
                            .then((resp) => resp.json().then(resolve))
                            .catch(reject);
                    } else {
                        reject("There is no url in uploader");
                    }
                },
            });
            if (signal) {
                signal.addEventListener("abort", () => {
                    uploader.abort(true);
                    reject(makeAbortError());
                });
            }
            uploader.start();
        });
        result.push(data);
    }

    return result;
}

export function fileUploader(
    options: FileUploaderOptions
): Promise<FileMeta[]> {
    if (isSupported) {
        return tusUpload(options);
    } else {
        return upload(options);
    }
}
