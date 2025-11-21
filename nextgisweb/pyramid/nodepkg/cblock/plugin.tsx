/** @plugin */

import { registry } from "@nextgisweb/pyramid/cblock/registry";

function TestentryBlock({ value }: { value: string }) {
    return <span>{value}</span>;
}

registry.register(COMP_ID, {
    slot: "pyramid.testentry",
    func: () => TestentryBlock,
});
