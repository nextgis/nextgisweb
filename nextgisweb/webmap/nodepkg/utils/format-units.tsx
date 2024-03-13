import type { Projection } from "ol/proj";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { AreaUnits, LengthUnits } from "@nextgisweb/webmap/type/api";

const m_to_km = 1e-3;
const m_to_ft = 1 / 0.3048;
const ft_to_mi = 1 / 5280;
const m2_to_ha = 1e-4;
const m2_to_ac = 1 / 4046.86;
const ac_to_mi2 = 1 / 640;

const msgSiM = gettext("m");
const msgSiKm = gettext("km");
const msgSiFt = gettext("ft");
const msgSiMi = gettext("mi");
const msgSiHa = gettext("ha");
const msgSiAc = gettext("ac");

export interface DefaultConfig {
    format: "html-string" | "jsx";
    locale: string;
}

const defaultConfig: DefaultConfig = {
    format: "html-string",
    locale: "en",
};

export const roundValue = (num: number, places: number) => {
    return (
        Math.round((num + Number.EPSILON) * Math.pow(10, places)) /
        Math.pow(10, places)
    );
};

const formatPlacesValue = (value: number): number => {
    let places;
    if (value > 0 && value < 1) {
        places = Math.floor(-Math.log10(value)) + 4;
    } else {
        places = 2;
    }
    return roundValue(value, places);
};

/**
 * Make localized string from number
 * @param {number} value - number
 * @param {string} locale - e.g. 'en'
 */
const formatLocaleNumber = (value: number, locale: string): string => {
    return value.toLocaleString(locale);
};

const makeDomResult = (
    value: string,
    postfix: JSX.Element | string,
    format: "html-string" | "jsx"
): string | JSX.Element => {
    const domResult = (
        <>
            {value} {postfix}
        </>
    );
    if (format === "html-string") {
        return `${value} ${postfix}`;
    } else if (format === "jsx") {
        return domResult;
    } else {
        throw Error(`Unknown format for units: ${format}`);
    }
};

interface MetersResult {
    value: number;
    postfix: JSX.Element | string;
}

const metersLengthToUnit = (
    meters: number,
    unit: LengthUnits
): MetersResult => {
    let resultValue;
    let postfix;

    switch (unit) {
        case "km":
            resultValue = meters * m_to_km;
            postfix = msgSiKm;
            break;
        case "metric":
            if (meters > 1000) {
                resultValue = meters * m_to_km;
                postfix = msgSiKm;
            } else {
                resultValue = meters;
                postfix = msgSiM;
            }
            break;
        case "ft":
            resultValue = meters * m_to_ft;
            postfix = msgSiFt;
            break;
        case "mi":
            resultValue = meters * m_to_ft * ft_to_mi;
            postfix = msgSiMi;
            break;
        case "imperial":
            resultValue = meters * m_to_ft;
            if (resultValue > 5280) {
                resultValue = resultValue * ft_to_mi;
                postfix = msgSiMi;
            } else {
                resultValue = meters;
                postfix = msgSiFt;
            }
            break;
        case "m":
            resultValue = meters;
            postfix = msgSiM;
            break;
    }

    return {
        value: resultValue,
        postfix,
    };
};

const metersAreaToUnit = (meters: number, unit: AreaUnits): MetersResult => {
    let resultValue;
    let postfix;

    const addSupSquare = (val: string) => `${val}²`;

    switch (unit) {
        case "sq_km":
            resultValue = meters * m_to_km * m_to_km;
            postfix = addSupSquare(msgSiKm);
            break;
        case "metric":
            if (meters > 1e5) {
                resultValue = meters * m_to_km * m_to_km;
                postfix = addSupSquare(msgSiKm);
            } else {
                resultValue = meters;
                postfix = addSupSquare(msgSiM);
            }
            break;
        case "ha":
            resultValue = meters * m2_to_ha;
            postfix = msgSiHa;
            break;
        case "ac":
            resultValue = meters * m2_to_ac;
            postfix = msgSiAc;
            break;
        case "sq_mi":
            resultValue = meters * m2_to_ac * ac_to_mi2;
            postfix = addSupSquare(msgSiMi);
            break;
        case "imperial":
            resultValue = meters * m2_to_ac;
            if (resultValue > 640 * 100) {
                resultValue = resultValue * ac_to_mi2;
                postfix = addSupSquare(msgSiMi);
            } else {
                resultValue = meters;
                postfix = msgSiAc;
            }
            break;
        case "sq_ft":
            resultValue = meters * m_to_ft * m_to_ft;
            postfix = addSupSquare(msgSiFt);
            break;
        case "sq_m":
            resultValue = meters;
            postfix = addSupSquare(msgSiM);
            break;
    }

    return {
        value: resultValue,
        postfix,
    };
};

/**
 * Format single value
 * @param {number} value - Coordinate value, e.g. 38.55555559
 * @param {string} locale - Locale, e.g. 'en'
 */
export const formatCoordinatesValue = (
    value: number,
    locale?: string
): string => {
    const numberRound = roundValue(value, 2);
    return numberRound.toLocaleString(locale);
};

/**
 * Calculate decimal places to rounding
 * @param {Object} proj - ol/proj/Projection
 * @return {number} Decimal places to rounding
 */
export const getDecPlacesRoundCoordByProj = (proj: Projection): number => {
    const extent = proj.getExtent();
    const max = Math.max.apply(
        null,
        extent.map((e) => Math.abs(e))
    );
    return max < 1000 ? 2 : 0;
};

/**
 * Round coordinates
 * @param {(number|number[])} coords - single value, array of coordinates
 * @param {number} places - decimal places to rounding
 */
export const roundCoords = (
    coords: number | number[],
    places: number
): number | number[] => {
    if (coords instanceof Array) {
        return coords.map((c) => roundValue(c, places));
    }
    return roundValue(coords, places);
};

/**
 * Format length in meters
 * @param {number} meters - length in meters
 * @param {string} unit - 'km', 'metric', 'ft', 'mi', 'imperial', 'm'
 * @param {Object} config - optional configuration
 * @param {string} config.format - 'html-string', 'jsx'
 * @param {string} config.locale - locale
 */
export const formatMetersLength = (
    meters: number,
    unit: LengthUnits,
    config?: DefaultConfig
) => {
    const _config = config || defaultConfig;

    const { value, postfix } = metersLengthToUnit(meters, unit);
    const placeValue = formatPlacesValue(value);
    const localNumber = formatLocaleNumber(placeValue, _config.locale);
    return makeDomResult(localNumber, postfix, _config.format);
};

/**
 * Format length in meters
 * @param {number} meters - area in meters
 * @param {string} unit - 'sq_km', 'metric', 'ha', 'ac', 'sq_mi', 'imperial', 'sq_ft', 'sq_m'
 * @param {Object} config - optional configuration
 * @param {string} config.format - 'html-string', 'jsx'
 * @param {string} config.locale - locale
 */
export const formatMetersArea = (
    meters: number,
    unit: AreaUnits,
    config?: DefaultConfig
) => {
    const _config = config || defaultConfig;

    const { value, postfix } = metersAreaToUnit(meters, unit);
    const placeValue = formatPlacesValue(value);
    const localNumber = formatLocaleNumber(placeValue, _config.locale);
    return makeDomResult(localNumber, postfix, _config.format);
};
