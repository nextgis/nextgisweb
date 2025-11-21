/** @testentry react */

import { CBlock } from ".";

declare module "@nextgisweb/pyramid/cblock" {
    interface CBlocks {
        "pyramid.testentry": { value: string };
    }
}

export default function CBlockTestentry() {
    return <CBlock slot="pyramid.testentry" payload={{ value: "Value" }} />;
}
