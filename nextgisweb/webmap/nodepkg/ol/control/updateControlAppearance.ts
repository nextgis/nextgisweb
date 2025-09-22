import type { CreateControlOptions } from "@nextgisweb/webmap/control-container/ControlContainer";

export type ControlAppearanceOptions = CreateControlOptions;

export function updateControlAppearance(
    el: HTMLElement,
    opts: ControlAppearanceOptions = {}
) {
    const { className, bar, margin, style } = opts;

    el.className = "";

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
        Object.entries(style).forEach(([k, v]) => {
            if (k.startsWith("--")) {
                // CSS variables assignment doesn't work by name
                el.style.setProperty(k, v);
            } else {
                el.style[k as unknown as any] = v;
            }
        });
    }
}
