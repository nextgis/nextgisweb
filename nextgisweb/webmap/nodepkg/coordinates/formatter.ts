type Direction = "N" | "S" | "E" | "W";

interface DMSResult {
    dir: Direction;
    deg: number;
    min: number;
    sec: number;
}

interface DMResult {
    dir: Direction;
    deg: number;
    min: number;
}

interface CoordOptions {
    lon?: boolean;
    needString?: boolean;
}

export const DDtoDMS = (
    value: number,
    options: CoordOptions
): DMSResult | string => {
    const result: DMSResult = {
        dir:
            value < 0
                ? options.lon
                    ? "W"
                    : "S"
                : ((options.lon ? "E" : "N") as Direction),
        deg: parseInt(String(value < 0 ? (value = -value) : value)),
        min: parseInt(String((value % 1) * 60)),
        sec: parseInt(String(((value * 60) % 1) * 60 * 100)) / 100,
    };

    if (options.needString) {
        return `${result.deg}°${result.min}'${result.sec}"${result.dir}`;
    }

    return result;
};

export const DDtoDM = (
    value: number,
    options: CoordOptions
): DMResult | string => {
    const result: DMResult = {
        dir:
            value < 0
                ? options.lon
                    ? "W"
                    : "S"
                : ((options.lon ? "E" : "N") as Direction),
        deg: parseInt(String(value < 0 ? (value = -value) : value)),
        min: parseInt(String((value % 1) * 60 * 100)) / 100,
    };

    if (options.needString) {
        return `${result.deg}°${result.min}'${result.dir}`;
    }

    return result;
};

export const lonLatToDM = (lonLat: [number, number]): string => {
    const [lon, lat] = lonLat;
    const strLon = `${lon.toFixed(3)} ${lon > 0 ? "E" : lon < 0 ? "W" : ""}`;
    const strLat = `${lat.toFixed(3)} ${lat > 0 ? "N" : lat < 0 ? "S" : ""}`;
    return `${strLon}, ${strLat}`;
};
