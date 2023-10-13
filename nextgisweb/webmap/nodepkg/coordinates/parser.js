/** @entrypoint */

import {
    makeRegexDecimalDegrees,
    makeRegexDegreesMinSec,
    makeRegexNonSpaceSeparator,
} from "./regex";

const RegexDecimalComma = /(\d+),(\d+)/gi;
const RegexCoordinatesTest =
    /^[nwse\d+.,\s+-/|\\\u00B0\u02DA\u00BA\u007E\u002A\u2032\u0027\u0022\u00A8\u02DD\u02B9\u2033]+$/i;
const RegexDecimalDegrees = makeRegexDecimalDegrees();
const RegexDegreesMinSec = makeRegexDegreesMinSec();
const RegexNonSpaceSeparator = makeRegexNonSpaceSeparator();

const removeMultiSpaces = (input) => {
    return input.replace(/  +/g, " ");
};

const fixDecimalComma = (decimalString) => {
    return decimalString.replace(RegexDecimalComma, "$1.$2");
};

const clearInput = (input) => {
    const trim = input.trim();
    const multiSpaces = removeMultiSpaces(trim);
    return fixDecimalComma(multiSpaces);
};

const stringToFloat = (floatString) => {
    return parseFloat(floatString);
};

/**
 * Converts DMS (degree minute seconds) to decimal degrees number
 * from coordinates object regex match.
 *
 * @param {object} coordinates The coordinates object.
 * @param {string} index The part of coordinates (A - first, B - second).
 * @return {number} Decimal degrees.
 */
const dmsToDecimal = (coordinates, index) => {
    const { match } = coordinates;
    let decimalDegrees = 0;

    if (match.groups[`dg${index}`]) {
        decimalDegrees = stringToFloat(match.groups[`dg${index}`]);
    }
    if (match.groups[`m${index}`]) {
        decimalDegrees += stringToFloat(match.groups[`m${index}`]) / 60;
    }
    if (match.groups[`s${index}`]) {
        decimalDegrees += stringToFloat(match.groups[`s${index}`]) / 3600;
    }

    return decimalDegrees;
};

const handleDmsNumbers = (coordinates) => {
    const { match } = coordinates;

    if (!match.groups.dgA || !match.groups.dgB) {
        throw new Error("Only one degrees part");
    }

    ["A", "B"].forEach((i) => {
        coordinates[i.toLowerCase()] = dmsToDecimal(coordinates, i);
    });
};

const handleDecimalNumbers = (coordinates) => {
    const { match } = coordinates;

    if (!match.groups.dA || !match.groups.dB) {
        throw new Error("Only one decimal degrees part");
    }

    ["A", "B"].forEach((i) => {
        coordinates[i.toLowerCase()] = stringToFloat(match.groups[`d${i}`]);
    });
};

const isLatValid = (number) => {
    return number >= -90 && number <= 90;
};

const isLonValid = (number) => {
    return number >= -180 && number <= 180;
};

/**
 * Determines whether the number is latitude or longitude
 *
 * @param {number} number The verifiable number.
 * @param {string} [hemisphere] The hemisphere character (N,S,E,W).
 * @return {Array<boolean>} Sign of X (longitude) and Y (latitude) - [isX, isY].
 */
const isNumberXY = (number, hemisphere) => {
    if (hemisphere === "N" || hemisphere === "S") {
        return [false, true];
    } else if (hemisphere === "W" || hemisphere === "E") {
        return [true, false];
    }

    if (isLatValid(number)) {
        return [true, true];
    } else if (!isLatValid(number) && isLonValid(number)) {
        return [true, false];
    }
};

/**
 * Applies hemisphere sign to part of coordinates by index
 *
 * @param {object} coordinates The coordinates object.
 * @param {string} index The part of coordinates (A - first, B - second).
 * @return {void}
 */
const _handleHemisphereSignByIndex = (coordinates, index) => {
    const { match } = coordinates;

    const sign = match.groups[`pre${index}`] || match.groups[`post${index}`];
    if (/[sw-]/i.test(sign)) {
        coordinates[index.toLowerCase()] *= -1;
    }
    coordinates[`isLonLat${index}`] = isNumberXY(
        coordinates[index.toLowerCase()],
        sign
    );
};

/**
 * Applies hemisphere sign to coordinates object decimal value
 *
 * @param {object} coordinates The coordinates object.
 * @return {void}
 */
const handleHemisphereSign = (coordinates) => {
    ["A", "B"].forEach((i) => _handleHemisphereSignByIndex(coordinates, i));
};

const makeCoordinatesPairs = (coordinates) => {
    const { a, isLonLatA, b, isLonLatB } = coordinates;
    const coordinatesPairs = [];

    if (isLonLatA[0] && isLonLatB[1] && isLonValid(a) && isLatValid(b)) {
        coordinatesPairs.push({ lon: a, lat: b });
    }

    if (isLonLatA[1] && isLonLatB[0] && isLonValid(b) && isLatValid(a)) {
        coordinatesPairs.push({ lon: b, lat: a });
    }

    return coordinatesPairs;
};

const parseDms = (input) => {
    const match = input.match(RegexDegreesMinSec);
    if (!match) return [];

    const coordinates = {
        match,
    };

    try {
        handleDmsNumbers(coordinates);
        handleHemisphereSign(coordinates);
        return makeCoordinatesPairs(coordinates);
    } catch (error) {
        return [];
    }
};

const parseDecimalDegrees = (input) => {
    const match = input.match(RegexDecimalDegrees);
    if (!match) return [];

    if (!match.groups.dA || !match.groups.dB) {
        return [];
    }

    const coordinates = {
        match,
    };

    try {
        handleDecimalNumbers(coordinates);
        handleHemisphereSign(coordinates);
        return makeCoordinatesPairs(coordinates);
    } catch (error) {
        return [];
    }
};

const handleSpaceSeparator = (input) => {
    if (RegexNonSpaceSeparator.test(input)) {
        return input;
    }
    const matchBySpaces = input.match(/[^\s\\]+/gi);
    const half = Math.ceil(matchBySpaces.length / 2);
    return `${matchBySpaces.slice(0, half).join(" ")}, ${matchBySpaces
        .slice(half)
        .join(" ")}`;
};

/**
 * Parses coordinates string
 *
 * @param {string} coordinatesString The coordinates object.
 * @return {object} Array of coordinates. Each coordinate is a
 * object: {lon: -73.935, lat: 40.73}.
 */
export function parse(coordinatesString) {
    let input = clearInput(coordinatesString);

    if (!RegexCoordinatesTest.test(input)) {
        return [];
    }

    input = handleSpaceSeparator(input);

    if (RegexDecimalDegrees.test(input)) {
        return parseDecimalDegrees(input);
    }

    if (RegexDegreesMinSec.test(input)) {
        return parseDms(input);
    }

    return [];
}
