export const transparentImage = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

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
            } else {
                return Promise.reject();
            }
        })
        .then((arrayBuffer) => {
            const blob = new Blob([arrayBuffer]);
            const urlCreator = window.URL || window.webkitURL;
            return urlCreator.createObjectURL(blob);
        })
        .catch(() => {
            return transparentImage;
        });
}
