import type { Coordinate } from "ol/coordinate";

export interface FormatterOptions {
    lon: boolean;
    needString: boolean;
}

export type FormatterResult = string | DMSFormat;

export interface DMSFormat {
    dir: string;
    deg: number;
    min: number;
    sec?: number;
}

export const DDtoDMS = (
    value: number,
    options: FormatterOptions
): FormatterResult => {
    let result: FormatterResult = {
        dir: value < 0 ? (options.lon ? "W" : "S") : options.lon ? "E" : "N",
        deg: Math.trunc(value < 0 ? (value = -value) : value),
        min: Math.trunc((value % 1) * 60),
        sec: Math.trunc(((value * 60) % 1) * 60 * 100) / 100,
    };

    if (options.needString)
        result =
            result.deg + "°" + result.min + "'" + result.sec + '"' + result.dir;

    return result;
};

export const DDtoDM = (value: number, options: FormatterOptions) => {
    let result: FormatterResult = {
        dir: value < 0 ? (options.lon ? "W" : "S") : options.lon ? "E" : "N",
        deg: Math.trunc(value < 0 ? (value = -value) : value),
        min: Math.trunc((value % 1) * 60 * 100) / 100,
    };

    if (options.needString)
        result = result.deg + "°" + result.min + "'" + result.dir;

    return result;
};

export const lonLatToDM = (lonLat: Coordinate) => {
    const [lon, lat] = lonLat;
    const strLon = `${lon.toFixed(3)} ${lon > 0 ? "E" : lon < 0 ? "W" : ""}`;
    const strLat = `${lat.toFixed(3)} ${lat > 0 ? "N" : lat < 0 ? "S" : ""}`;
    return `${strLon}, ${strLat}`;
};
