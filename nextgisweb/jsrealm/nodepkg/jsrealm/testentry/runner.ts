import { registry as drivers } from "./driver";
import { registry as testentries } from "./registry";

export default (identity: string, element: HTMLElement) => {
    const p = testentries.queryOne({ identity });
    const d = drivers.queryOne({ identity: p.driver });
    d.load().then((driver) => {
        p.value().then(({ default: value }) => {
            driver(value, element);
        });
    });
};
