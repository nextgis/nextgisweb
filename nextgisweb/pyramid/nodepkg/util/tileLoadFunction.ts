export const transparentImage =
    "data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

interface TileLoadFunctionOptions extends RequestInit {
    src: string;
}

export function tileLoadFunction({
    src,
    ...requestInit
}: TileLoadFunctionOptions): Promise<string> {
    return fetch(src, {
        method: "GET",
        ...requestInit,
    })
        .then((response) => {
            if (response.ok) {
                return response.arrayBuffer();
                // return Promise.reject();
            } else {
                return Promise.reject();
            }
        })
        .then((arrayBuffer) => {
            const blob = new Blob([arrayBuffer]);
            const urlCreator = window.URL || window.webkitURL;
            return urlCreator.createObjectURL(blob);
        })
        .catch(() => transparentImage);
}
