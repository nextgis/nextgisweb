import type { DynMenuItem } from "@nextgisweb/pyramid/layout/dynmenu/type";

import { Dynmenu } from "../layout";

interface ControlPanelProps {
    items: DynMenuItem[];
}

export function ControlPanel({ items }: ControlPanelProps) {
    return <Dynmenu items={items} />;
}
