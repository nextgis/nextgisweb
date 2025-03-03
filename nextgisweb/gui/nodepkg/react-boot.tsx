import type { FC } from "react";

interface ReactBootOpts {
    name?: string;
}

export default function reactBoot(
    module: string | FC,
    props: any,
    element: string | HTMLElement | ((comp: any) => string | HTMLElement),
    opts?: ReactBootOpts
) {
    let loader;
    if (typeof module === "string") {
        loader = ngwEntry<any>(module).then((m) => m[opts?.name ?? "default"]);
    } else {
        loader = new Promise((resolve) => resolve(module));
    }

    Promise.all([
        import("@nextgisweb/gui/react-app").then((m) => m.default),
        loader,
    ]).then(([reactApp, comp]) => {
        if (typeof element === "function") {
            element = element(comp);
        }

        if (typeof element === "string") {
            const getElement = document.getElementById(element);
            if (!getElement) throw Error(`Element '${element}' not found!`);
            element = getElement;
        }

        reactApp(comp, props, element);
    });
}
