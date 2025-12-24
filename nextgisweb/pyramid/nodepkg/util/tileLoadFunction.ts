import { hmuxFetch } from "./hmux";

export const transparentImage =
    "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEAAAAALAAAAAABAAEAAAIBAAA=";

interface TileLoadFunctionOptions extends RequestInit {
    src: string;
    hmux?: boolean;
    noDataStatuses?: number[];
}

export async function tileLoadFunction({
    src,
    hmux,
    noDataStatuses = [204],
    ...requestInit
}: TileLoadFunctionOptions): Promise<string> {
    const response = await (hmux ? hmuxFetch : fetch)(src, {
        method: "GET",
        ...requestInit,
    });
    if (response.status === 200) {
        const blob = await response.blob();
        return window.URL.createObjectURL(blob);
    } else if (noDataStatuses.includes(response.status)) {
        return transparentImage;
    }
    throw new Error(`Unable to load tile. Status: ${response.status}`);
}
