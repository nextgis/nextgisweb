import type { UserReadBrief } from "@nextgisweb/auth/type/api";

import { route } from "./route";

/** This testentry for test typings only */
async function routeTest() {
    const resp = await route("resource.blueprint").get();

    console.log(resp.resources);
    console.log(resp.scopes);

    // if lunkwillReturnUrl true - return string
    const lwResp = await route("resource.blueprint").get({
        lunkwillReturnUrl: true,
    });
    console.log(typeof lwResp === "string");
}

routeTest();

export const test = async () => {
    const data = await route("pyramid.settings").get({
        query: { component: "pyramid" },
    });
    data.key;
    data.key;

    await route("pyramid.settings").get({
        // @ts-expect-error error Type '"auth1"' is not assignable to component type
        query: { component: "auth1" },
    });

    const user = await route("auth.user.item", { id: 1 }).get({
        query: { brief: true },
    });
    user.display_name;
    // @ts-expect-error Property 'display_name1' does not exist on type 'UserRead | UserReadBrief'
    user.display_name1;

    const user1 = await route("auth.user.item", { id: 1 }).get<UserReadBrief>({
        query: { brief: true },
    });
    user1.display_name;
    // @ts-expect-error Property 'alink' does not exist on type 'UserReadBrief'.
    user1.alink;
    // @ts-expect-error Property 'language' does not exist on type 'UserReadBrief'
    user1.language;

    const ui = route("auth.user.item", 0);

    /* Errors expected */

    // @ts-expect-error no post method in ui
    ui.post();

    // @ts-expect-error expected json body
    ui.put();

    // @ts-expect-error JSON body type mismatch
    ui.put({ json: { keyname: true } });

    // JSON-encoded body
    ui.put({ body: "{}" });

    // @ts-expect-error there is no body for GET
    ui.get({ json: {} });

    ui.get({ responseType: "blob" }).then((blob) => {
        blob as Blob;
    });
    ui.get({ responseType: "json" }).then((blob) => {
        // @ts-expect-error Conversion of type 'UserRead | UserReadBrief' to type 'Blob'
        blob as Blob;
    });
    ui.get().then((blob) => {
        // @ts-expect-error Conversion of type 'UserRead | UserReadBrief' to type 'Blob'
        blob as Blob;
    });

    ui.get({ lunkwillReturnUrl: true }).then((str) => {
        str as string;
    });
    ui.get().then((str) => {
        // @ts-expect-error Conversion of type 'UserRead | UserReadBrief' to type 'string'
        str as string;
    });

    const cs = route("pyramid.settings");
    // @ts-expect-error Query parameter 'component' required
    cs.get();

    const uc = route("auth.user.collection");

    // @ts-expect-error An argument for 'options' was not provided
    uc.post();

    uc.post({ body: "{}" });
    uc.post({ json: { display_name: "Name", keyname: "name" } });
};
