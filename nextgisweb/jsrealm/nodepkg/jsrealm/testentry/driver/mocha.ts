import entrypoint from "@nextgisweb/jsrealm/entrypoint";

import "./mocha.less";

export default (value: (...args: []) => void, el: HTMLElement) => {
    const root = document.createElement("div");
    root.id = "mocha";
    el.append(root);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entrypoint("mocha").then((mocha: any) => {
        mocha.setup("bdd");
        value();
        mocha.run();
    });
};
