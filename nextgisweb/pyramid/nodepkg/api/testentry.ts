import { route } from "./route";

import type { Blueprint } from "@nextgisweb/resource/type";

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

/** Types check */
// // Ok
// route("auth.alink", { token: "asd" });
// route("pyramid.control_panel");
// route("pyramid.static", "key");
// route("pyramid.static", { skey: "key" });
// route("ogcfserver.item", { id: 1, collection_id: "key", item_id: 2 });
// route("pyramid.control_panel");
// route("feature_attachment.download", 1, 6, 3);
// route("feature_attachment.download", { id: 1, fid: 6, aid: 3 });
// route("pyramid.static", { skey: "key" });
// route("pyramid.static", "key");

// // Error
// route("feature_attachment.download") // нет обязательных аргументов
// route("ogcfserver.item", 1); // more than one prop
// route("pyramid.control_panel", 1); // no param for this route
// route("pyramid.static", { skey: 1 }); // skey is string
// route("pyramid.static", 1); // must be string
// route("ogcfserver.item", { skey: "key" }); // wrong params
// route("pyramid.control_panel", { id: 12 }) // there should be no arguments
// route("pyramid.control_panel", 12) // there should be no arguments
// route("feature_attachment.download", "a", "b", "c") // неверный тип аргументов
// route("feature_attachment.download", { id: "a"; fid: "b"; aid: "c" }) // incorrect arguments type
// route("feature_attachment.download", 1) // incorrect number of arguments
// route("feature_attachment.download", 1, "6", 3); // incorrect arguments type
