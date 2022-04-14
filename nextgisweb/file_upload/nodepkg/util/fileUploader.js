import { Upload, isSupported } from "tus-js-client";
import { routeURL } from "@nextgisweb/pyramid/api";
import settings from "@nextgisweb/pyramid/settings!file_upload";

export function fileUploader(options) {
    if (settings.tus.enabled && isSupported) {
        return tusUpload(options);
    } else {
        return upload(options);
    }
}

async function upload({ files, onProgress, signal }) {
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
                reject(new DOMException("Aborted", "AbortError"));
            });
        }
        xhr.send(data);
    });
}

async function tusUpload({ files, onProgress, signal }) {
    const result = [];

    let totalFilesSize = 0;
    let alreadyUloadedSize = 0;

    for (const file of files) {
        totalFilesSize += file.size;
        let progressFileSize = 0;
        const data = await new Promise((resolve, reject) => {
            const uploader = new Upload(file, {
                endpoint: routeURL("file_upload.collection"),
                storeFingerprintForResuming: false,
                chunkSize: settings.tus.chunk_size.default,
                metadata: { name: file.name },
                onProgress: (bytesUploaded) => {
                    if (onProgress) {
                        progressFileSize = bytesUploaded;
                        const decimal =
                            (alreadyUloadedSize + progressFileSize) /
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
                    const response = error.originalResponse;
                    const respHeader = response.getHeader("Content-Type");
                    if (respHeader === "application/json") {
                        error = JSON.parse(response.getBody());
                    }
                    reject(error);
                },
                onSuccess: () => {
                    alreadyUloadedSize += progressFileSize;
                    window
                        .fetch(uploader.url, { signal })
                        .then((resp) => resp.json().then(resolve))
                        .catch(reject);
                },
            });
            if (signal) {
                signal.addEventListener("abort", () => {
                    uploader.abort();
                    reject(new DOMException("Aborted", "AbortError"));
                });
            }
            uploader.start();
        });
        result.push(data);
    }

    return result;
}
