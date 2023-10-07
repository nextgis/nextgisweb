export const DDtoDMS = (value, options) => {
    let result = {
        dir: value < 0 ? (options.lon ? "W" : "S") : options.lon ? "E" : "N",
        deg: parseInt(value < 0 ? (value = -value) : value),
        min: parseInt((value % 1) * 60),
        sec: parseInt(((value * 60) % 1) * 60 * 100) / 100,
    };

    if (options.needString)
        result =
            result.deg + "°" + result.min + "'" + result.sec + '"' + result.dir;

    return result;
};

export const DDtoDM = (value, options) => {
    let result = {
        dir: value < 0 ? (options.lon ? "W" : "S") : options.lon ? "E" : "N",
        deg: parseInt(value < 0 ? (value = -value) : value),
        min: parseInt((value % 1) * 60 * 100) / 100,
    };

    if (options.needString)
        result = result.deg + "°" + result.min + "'" + result.dir;

    return result;
};

export const lonLatToDM = (lonLat) => {
    const [lon, lat] = lonLat;
    const strLon = `${lon.toFixed(3)} ${lon > 0 ? "E" : lon < 0 ? "W" : ""}`;
    const strLat = `${lat.toFixed(3)} ${lat > 0 ? "N" : lat < 0 ? "S" : ""}`;
    return `${strLon}, ${strLat}`;
};
