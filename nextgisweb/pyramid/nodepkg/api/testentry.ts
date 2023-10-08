import type { Blueprint } from "@nextgisweb/resource/type";

import { route } from "./route";

/** This testentry for test typings only */
async function routeTest() {
    const resp: Blueprint = await route("resource.blueprint").get<Blueprint>();

    console.log(resp.resources);
    console.log(resp.scopes);

    // if lunkwillReturnUrl true - return string
    const lwResp: string = await route("resource.blueprint").get({
        lunkwillReturnUrl: true,
    });
    console.log(typeof lwResp === "string");
}

routeTest();
