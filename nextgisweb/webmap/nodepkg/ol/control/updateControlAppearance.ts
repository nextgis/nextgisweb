import type { CreateControlOptions } from "@nextgisweb/webmap/control-container/ControlContainer";

export type ControlAppearanceOptions = CreateControlOptions;

export function updateControlAppearance(
    el: HTMLElement,
    opts: ControlAppearanceOptions = {}
) {
    const { className, bar, margin, style } = opts;

    el.className = "";

    el.classList.remove(
        "ol-unselectable",
        "mapadapter-ctrl-group",
        "mapadapter-ctrl-margin"
    );

    el.classList.add("mapadapter-ctrl");
    el.classList.add("ol-unselectable");
    if (bar) {
        el.classList.add("mapadapter-ctrl-group");
    }
    if (margin) {
        el.classList.add("mapadapter-ctrl-margin");
    }

    if (className) {
        className
            .trim()
            .split(/\s+/)
            .forEach((cls) => {
                if (cls) {
                    el.classList.add(cls);
                }
            });
    }

    if (style) {
        Object.assign(el.style, style);
    }
}
