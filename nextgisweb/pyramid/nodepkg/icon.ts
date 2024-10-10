/** @entrypoint */
import "@nextgisweb/jsrealm/shared-icon";

export function html({
    collection,
    glyph,
    variant,
    fill = "currentColor",
}: {
    collection?: string;
    glyph: string;
    variant?: "baseline" | string;
    fill?: "currentColor" | string;
}) {
    const id =
        `icon-${collection || "material"}-${glyph}` +
        (variant && variant !== "baseline" ? `-${variant}` : "");
    return `<svg class="icon" fill="${fill}"><use xlink:href="#${id}"/></svg>`;
}
