import type { FC } from "react";

import "@nextgisweb/jsrealm/icon.inc";

export function iconHtml(icon: FC & { id: string }) {
    return `<svg class="icon" fill="currentColor"><use xlink:href="#${icon.id}"/></svg>`;
}
