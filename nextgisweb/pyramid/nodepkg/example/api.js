/** @entrypoint */
import { request } from "@nextgisweb/pyramid/api";
import { errorModal } from "@nextgisweb/gui/error";

export default async () => {
    let data;
    try {
        data = await request("/api/some");
    } catch (e) {
        errorModal(e);
    }
    return JSON.stringify(data);
};
