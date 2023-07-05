/** @testentry call */
import { request } from "@nextgisweb/pyramid/api";
import { errorModal } from "@nextgisweb/gui/error";

export default async function () {
    let data;
    try {
        data = await request("/api/some");
    } catch (e) {
        errorModal(e);
    }
    return JSON.stringify(data);
}
