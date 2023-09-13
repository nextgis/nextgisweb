import mocha from "mocha";

import entrypoint from "@nextgisweb/jsrealm/entrypoint";

import "./mocha.less";

// const cssUrl = ngwConfig.staticUrl + "mocha/mocha.css";
// document.head.insertAdjacentHTML(
//     "beforeend",
//     `<link href="${cssUrl}" rel="stylesheet" type="text/css">`
// );

export default (name: string, el: HTMLElement) => {
    const root = document.createElement("div");
    root.id = "mocha";
    el.append(root);

    mocha.setup("bdd");
    entrypoint(name).then(() => {
        mocha.run();
    });
};
