import ReactDOMServer from "react-dom/server";
import i18n from "@nextgisweb/pyramid/i18n!webmap";

const m_to_km = 1E-3;
const m_to_ft = 1 / 0.3048;
const ft_to_mi = 1 / 5280;
const m2_to_ha = 1E-4;
const m2_to_ac = 1 / 4046.86;
const ac_to_mi2 = 1 / 640;

const SI_m = i18n.gettext("m");
const SI_km = i18n.gettext("km");
const SI_ft = i18n.gettext("ft");
const SI_mi = i18n.gettext("mi");
const SI_ha = i18n.gettext("ha");
const SI_ac = i18n.gettext("ac");

const defaultConfig = {
    format: "html-string",
    locale: "en"
};

const formatPlacesValue = (value) => {
    let places;
    if (value < 1) {
        places = Math.floor(-Math.log10(value)) + 4;
    } else {
        places = 2;
    }
    return Math.round(value * (10 * places)) / (10 * places);
};

/**
 * Make localized string from number
 * @param {number} value - number
 * @param {string} locale - e.g. 'en'
 */
const formatLocaleNumber = (value, locale) => {
    return value.toLocaleString(locale);
};

const makeDomResult = (value, postfix, format) => {
    const domResult = <>{value} {postfix}</>;
    if (format === "html-string") {
        return ReactDOMServer.renderToStaticMarkup(domResult);
    } else if (format === "jsx") {
        return domResult;
    } else {
        throw Error(`Unknown format for units: ${format}`);
    }
};

const metersLengthToUnit = (meters, unit) => {
    let resultValue;
    let postfix;

    switch (unit) {
        case "km":
            resultValue = meters * m_to_km;
            postfix = SI_km;
            break;
        case "metric":
            if (meters > 1000) {
                resultValue = meters * m_to_km;
                postfix = SI_km;
            } else {
                resultValue = meters;
                postfix = SI_m;
            }
            break;
        case "ft":
            resultValue = meters * m_to_ft;
            postfix = SI_ft;
            break;
        case "mi":
            resultValue = meters * m_to_ft * ft_to_mi;
            postfix = SI_mi;
            break;
        case "imperial":
            resultValue = meters * m_to_ft;
            if (resultValue > 5280) {
                resultValue = resultValue * ft_to_mi;
                postfix = SI_mi;
            } else {
                resultValue = meters;
                postfix = SI_ft;
            }
            break;
        case "m":
        default:
            resultValue = meters;
            postfix = SI_m;
    }

    return {
        value: resultValue,
        postfix
    };
};

const metersAreaToUnit = (meters, unit) => {
    let resultValue;
    let postfix;

    switch (unit) {
        case "sq_km":
            resultValue = meters * m_to_km * m_to_km;
            postfix = <>{SI_km}<sup>2</sup></>;
            break;
        case "metric":
            if (meters > 1E5) {
                resultValue = meters * m_to_km * m_to_km;
                postfix = <>{SI_km}<sup>2</sup></>;
            } else {
                resultValue = meters;
                postfix = <>{SI_m}<sup>2</sup></>;
            }
            break;
        case "ha":
            resultValue = meters * m2_to_ha;
            postfix = SI_ha;
            break;
        case "ac":
            resultValue = meters * m2_to_ac;
            postfix = SI_ac;
            break;
        case "sq_mi":
            resultValue = meters * m2_to_ac * ac_to_mi2;
            postfix = <>{SI_mi}<sup>2</sup></>;
            break;
        case "imperial":
            resultValue = meters * m2_to_ac;
            if (resultValue > (640 * 100)) {
                resultValue = resultValue * ac_to_mi2;
                postfix = <>{SI_mi}<sup>2</sup></>;
            } else {
                resultValue = meters;
                postfix = SI_ac;
            }
            break;
        case "sq_ft":
            resultValue = meters * m_to_ft * m_to_ft;
            postfix = <>{SI_ft}<sup>2</sup></>;
            break;
        case "sq_m":
        default:
            resultValue = meters;
            postfix = <>{SI_m}<sup>2</sup></>;
    }

    return {
        value: resultValue,
        postfix
    };
};

/**
 * Format length in meters
 * @param {number} meters - length in meters
 * @param {string} unit - 'km', 'metric', 'ft', 'mi', 'imperial', 'm'
 * @param {Object} config - optional configuration
 * @param {string} config.format - 'html-string', 'jsx'
 * @param {string} config.locale - locale
 */
export const formatMetersLength = (meters, unit, config) => {
    let _config = config || defaultConfig;

    let {value, postfix} = metersLengthToUnit(meters, unit);
    value = formatPlacesValue(value);
    value = formatLocaleNumber(value, _config.locale);
    return makeDomResult(value, postfix, _config.format);
};

/**
 * Format length in meters
 * @param {number} meters - area in meters
 * @param {string} unit - 'sq_km', 'metric', 'ha', 'ac', 'sq_mi', 'imperial', 'sq_ft', 'sq_m'
 * @param {Object} config - optional configuration
 * @param {string} config.format - 'html-string', 'jsx'
 * @param {string} config.locale - locale
 */
export const formatMetersArea = (meters, unit, config) => {
    let _config = config || defaultConfig;

    let {value, postfix} = metersAreaToUnit(meters, unit);
    value = formatPlacesValue(value);
    value = formatLocaleNumber(value, _config.locale);
    return makeDomResult(value, postfix, _config.format);
};
