import {
    makeRegexDecimalDegrees,
    makeRegexDegreesMinSec,
    makeRegexNonSpaceSeparator,
} from "./regex";
import type { GroupName } from "./regex";

interface Coordinate {
    lon: number;
    lat: number;
}

type CoordinatesMatchGroups = {
    [K in GroupName]?: string;
};

type CoordinateIndex = "A" | "B";
const coordIndexes: CoordinateIndex[] = ["A", "B"];

interface CoordinatesMatch {
    groups: CoordinatesMatchGroups;
}

interface CoordinatesObject {
    match: CoordinatesMatch;
    a?: number;
    b?: number;
    isLonLatA?: [boolean, boolean];
    isLonLatB?: [boolean, boolean];
}

type IsXYResult = [boolean, boolean];

const RegexDecimalComma = /(\d+),(\d+)/gi;
const RegexCoordinatesTest =
    /^[nwse\d+.,\s+-/|\\\u00B0\u02DA\u00BA\u007E\u002A\u2032\u0027\u0022\u00A8\u02DD\u02B9\u2033]+$/i;
const RegexDecimalDegrees = makeRegexDecimalDegrees();
const RegexDegreesMinSec = makeRegexDegreesMinSec();
const RegexNonSpaceSeparator = makeRegexNonSpaceSeparator();

const removeMultiSpaces = (input: string): string => {
    return input.replace(/  +/g, " ");
};

const fixDecimalComma = (decimalString: string): string => {
    return decimalString.replace(RegexDecimalComma, "$1.$2");
};

const clearInput = (input: string): string => {
    const trim = input.trim();
    const multiSpaces = removeMultiSpaces(trim);
    return fixDecimalComma(multiSpaces);
};

const stringToFloat = (floatString: string): number => {
    return parseFloat(floatString);
};

/**
 * Converts DMS (degree minute seconds) to decimal degrees number
 * from coordinates object regex match.
 *
 * @param coordinates The coordinates object.
 * @param index The part of coordinates (A - first, B - second).
 * @return Decimal degrees.
 */
const dmsToDecimal = (
    coordinates: CoordinatesObject,
    index: CoordinateIndex
): number => {
    const { match } = coordinates;
    let decimalDegrees = 0;

    const dgKey = `dg${index}` as GroupName;
    const mKey = `m${index}` as GroupName;
    const sKey = `s${index}` as GroupName;

    if (match.groups[dgKey]) {
        decimalDegrees = stringToFloat(match.groups[dgKey]!);
    }
    if (match.groups[mKey]) {
        decimalDegrees += stringToFloat(match.groups[mKey]!) / 60;
    }
    if (match.groups[sKey]) {
        decimalDegrees += stringToFloat(match.groups[sKey]!) / 3600;
    }

    return decimalDegrees;
};

const handleDmsNumbers = (coordinates: CoordinatesObject): void => {
    const { match } = coordinates;

    if (!match.groups.dgA || !match.groups.dgB) {
        throw new Error("Only one degrees part");
    }
    coordIndexes.forEach((i) => {
        coordinates[i.toLowerCase() as "a" | "b"] = dmsToDecimal(
            coordinates,
            i
        );
    });
};

const handleDecimalNumbers = (coordinates: CoordinatesObject): void => {
    const { match } = coordinates;

    if (!match.groups.dA || !match.groups.dB) {
        throw new Error("Only one decimal degrees part");
    }

    coordIndexes.forEach((i) => {
        coordinates[i.toLowerCase() as "a" | "b"] = stringToFloat(
            match.groups[`d${i}`]!
        );
    });
};

const isLatValid = (number: number): boolean => {
    return number >= -90 && number <= 90;
};

const isLonValid = (number: number): boolean => {
    return number >= -180 && number <= 180;
};

/**
 * Determines whether the number is latitude or longitude
 *
 * @param number The verifiable number.
 * @param hemisphere The hemisphere character (N,S,E,W).
 * @return Sign of X (longitude) and Y (latitude) - [isX, isY].
 */
const isNumberXY = (number: number, hemisphere?: string): IsXYResult => {
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
    return [false, false];
};

/**
 * Applies hemisphere sign to part of coordinates by index
 *
 * @param coordinates The coordinates object.
 * @param index The part of coordinates (A - first, B - second).
 */
const _handleHemisphereSignByIndex = (
    coordinates: CoordinatesObject,
    index: CoordinateIndex
): void => {
    const { match } = coordinates;

    const sign = match.groups[`pre${index}`] || match.groups[`post${index}`];
    if (/[sw-]/i.test(sign || "")) {
        coordinates[index.toLowerCase() as "a" | "b"]! *= -1;
    }
    coordinates[`isLonLat${index}` as "isLonLatA" | "isLonLatB"] = isNumberXY(
        coordinates[index.toLowerCase() as "a" | "b"]!,
        sign
    );
};

/**
 * Applies hemisphere sign to coordinates object decimal value
 *
 * @param coordinates The coordinates object.
 */
const handleHemisphereSign = (coordinates: CoordinatesObject): void => {
    coordIndexes.forEach((i) => _handleHemisphereSignByIndex(coordinates, i));
};

const makeCoordinatesPairs = (
    coordinates: Required<
        Pick<CoordinatesObject, "a" | "b" | "isLonLatA" | "isLonLatB">
    >
): Coordinate[] => {
    const { a, isLonLatA, b, isLonLatB } = coordinates;
    const coordinatesPairs: Coordinate[] = [];

    if (isLonLatA[0] && isLonLatB[1] && isLonValid(a) && isLatValid(b)) {
        coordinatesPairs.push({ lon: a, lat: b });
    }

    if (isLonLatA[1] && isLonLatB[0] && isLonValid(b) && isLatValid(a)) {
        coordinatesPairs.push({ lon: b, lat: a });
    }

    return coordinatesPairs;
};

const parseDms = (input: string): Coordinate[] => {
    const match = input.match(RegexDegreesMinSec);
    if (!match) return [];

    const coordinates: CoordinatesObject = {
        match: match as unknown as CoordinatesMatch,
    };

    try {
        handleDmsNumbers(coordinates);
        handleHemisphereSign(coordinates);
        return makeCoordinatesPairs(
            coordinates as Required<
                Pick<CoordinatesObject, "a" | "b" | "isLonLatA" | "isLonLatB">
            >
        );
    } catch (error) {
        return [];
    }
};

const parseDecimalDegrees = (input: string): Coordinate[] => {
    const match = input.match(RegexDecimalDegrees);
    if (!match) return [];

    if (!match.groups?.dA || !match.groups?.dB) {
        return [];
    }

    const coordinates: CoordinatesObject = {
        match: match as unknown as CoordinatesMatch,
    };

    try {
        handleDecimalNumbers(coordinates);
        handleHemisphereSign(coordinates);
        return makeCoordinatesPairs(
            coordinates as Required<
                Pick<CoordinatesObject, "a" | "b" | "isLonLatA" | "isLonLatB">
            >
        );
    } catch (error) {
        return [];
    }
};

const handleSpaceSeparator = (input: string): string => {
    if (RegexNonSpaceSeparator.test(input)) {
        return input;
    }
    const matchBySpaces = input.match(/[^\s\\]+/gi);
    if (!matchBySpaces) return input;

    const half = Math.ceil(matchBySpaces.length / 2);
    return `${matchBySpaces.slice(0, half).join(" ")}, ${matchBySpaces
        .slice(half)
        .join(" ")}`;
};

/**
 * Parses coordinates string
 *
 * @param coordinatesString The coordinates string to parse.
 * @return Array of coordinates. Each coordinate is a object: {lon: -73.935, lat: 40.73}.
 */
export function parse(coordinatesString: string): Coordinate[] {
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
