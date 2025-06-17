import { getURLParams } from "./URL";
import type { URLParams } from "./URL";

interface ParamConfig<T> {
    parse?: (value: string | boolean) => T;
}

type ConfigOption<T> = ParamConfig<T>;

export class UrlParams<T extends object> {
    constructor(
        private config: Partial<{ [K in keyof T]: ConfigOption<T[K]> }>
    ) {}

    public values(): T {
        const urlParams: URLParams = getURLParams();
        const result = {} as T;
        for (const key in urlParams) {
            if (Object.prototype.hasOwnProperty.call(urlParams, key)) {
                const conf = this.config[key as keyof T];
                if (conf && typeof conf.parse === "function") {
                    result[key as keyof T] = conf.parse(urlParams[key]);
                } else {
                    result[key as keyof T] = urlParams[key] as any;
                }
            }
        }
        return result;
    }
}
