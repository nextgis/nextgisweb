import { gettext } from "@nextgisweb/pyramid/i18n";

import type { WellKnownName } from "../type/Style";

export const wellKnownNames: { value: WellKnownName; label: string }[] = [
    { value: "square", label: gettext("Square") },
    { value: "circle", label: gettext("Circle") },
    { value: "triangle", label: gettext("Triangle") },
    { value: "star", label: gettext("Star") },
    { value: "cross", label: gettext("Cross") },
];
