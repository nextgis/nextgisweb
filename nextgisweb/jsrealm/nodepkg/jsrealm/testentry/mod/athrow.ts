import { sleep } from "@nextgisweb/gui/util";

await (async () => {
    await sleep(100);
    throw new Error("fail");
})();

export const named = "named";
export default "default";
