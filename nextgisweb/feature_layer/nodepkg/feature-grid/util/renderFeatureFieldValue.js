import { utc } from "@nextgisweb/gui/dayjs";

export function renderFeatureFieldValue({ datatype }, val) {
    if (val) {
        if (datatype === "DATETIME") {
            return utc(new Date(val)).local().format("L LTS");
        } else if (datatype === "DATE") {
            return utc(new Date(val)).local().format("L");
        } else if (datatype === "TIME") {
            const dt = new Date(`1970-01-01T${val}`);
            return utc(dt).local().format("LTS");
        }
    }
    return val;
}
