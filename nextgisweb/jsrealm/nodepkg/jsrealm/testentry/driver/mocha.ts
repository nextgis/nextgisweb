import mocha from "mocha";

import "./mocha.less";

export default (value: (...args: []) => void, el: HTMLElement) => {
    const root = document.createElement("div");
    root.id = "mocha";
    el.append(root);

    mocha.setup("bdd");
    value();
    mocha.run();
};
