/** @entrypoint */
import tablesort from "tablesort";
export default tablesort;

export function byId(id) {
    tablesort(document.getElementById(id));
}
