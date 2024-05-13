import Papa from "papaparse";
import type { ParseConfig, ParseResult } from "papaparse";

export async function parseCsv<T>(
    file: File | string,
    options?: ParseConfig<T>
): Promise<ParseResult<T>> {
    if (typeof file === "string") {
        return Papa.parse(file, options);
    }
    return new Promise((resolve, reject) => {
        const textType = /text.*/;
        const csvType = "application/vnd.ms-excel";

        if (
            file instanceof File &&
            (file.type.match(textType) || file.type === csvType)
        ) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result;
                resolve(parseCsv(String(text)));
            };
            reader.readAsText(file);
        } else {
            reject("Not a CSV file");
        }
    });
}
