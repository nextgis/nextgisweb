import { registry as drivers } from "./driver";
import { registry as testentries } from "./registry";

export default (identity: string, element: HTMLElement) => {
    const p = testentries.queryOne({ identity: identity });
    const d = drivers.queryOne({ identity: p.driver });
    d.load().then((driver) => {
        p.value().then(({ default: value }) => {
            driver(value, element);
        });
    });
};

export const menu = (selected: string, element: HTMLElement) => {
    const root = document.createElement("ul");
    root.className = "ngw-pyramid-dynmenu";
    element.appendChild(root);

    let prefix;
    for (const p of testentries.query()) {
        const parts = p.identity.split("/");
        const cprefix = parts.slice(0, 2).join("/");
        const crest = parts.slice(2).join("/");
        if (prefix !== cprefix) {
            const l = document.createElement("li");
            l.className = "label";
            l.innerText = cprefix;
            root.appendChild(l);
            prefix = cprefix;
        }

        const l = document.createElement("li");
        l.className = "item" + (selected === p.identity ? " selected" : "");
        root.appendChild(l);

        const a = document.createElement("a");
        a.href = `/testentry/${p.identity}`;
        a.innerText = crest;
        l.appendChild(a);
    }
};
