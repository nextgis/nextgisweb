import { isAbortError } from "@nextgisweb/gui/error";
import { extentInterfaces } from "@nextgisweb/layer-preview/constant";
import { route } from "@nextgisweb/pyramid/api";

export async function fetchResourceExtent({
    signal,
    resourceId,
}: {
    signal: AbortSignal;
    resourceId: number;
}) {
    const id = resourceId;
    try {
        const resData = await route("resource.item", id).get({
            signal,
            cache: true,
        });
        if (resData) {
            if (
                resData.resource.interfaces.some((iface) =>
                    extentInterfaces.includes(iface)
                )
            ) {
                const data = await route("layer.extent", id).get({
                    signal,
                });

                return data.extent;
            }
        }
    } catch (er) {
        if (!isAbortError(er)) {
            throw er;
        }
    }
}
