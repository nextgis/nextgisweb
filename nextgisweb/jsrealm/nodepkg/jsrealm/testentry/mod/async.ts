import { sleep } from "@nextgisweb/gui/util";

let d, n;
await (async () => {
    await sleep(100);
    d = "default";
    n = "named";
})();

export const named = n ?? "";
export default d ?? "";
