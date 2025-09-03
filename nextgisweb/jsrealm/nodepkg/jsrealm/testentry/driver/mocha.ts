import "./mocha.less";

import type * as Mocha from "mocha";

export default async (value: (...args: []) => void, el: HTMLElement) => {
    const root = document.createElement("div");
    root.id = "mocha";
    el.append(root);
    // @ts-expect-error There is no type declarations for Mocha UMD
    await import("mocha/mocha");
    const mocha = (window as any).mocha as Mocha.MochaGlobals;
    mocha.setup("bdd");
    value();
    mocha.run();
};
