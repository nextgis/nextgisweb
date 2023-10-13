const hemisphereSign = (groupName) => {
    return String.raw`(?<${groupName}>[nwse+-])`;
};

const decimalDegrees = (groupName) => {
    return String.raw`(?<${groupName}>\d{1,3}(\.\d+)?)`;
};

const nonSpaceSeparators = () => {
    return String.raw`,\/|\\`;
};

const separator = () => {
    return String.raw`([\s${nonSpaceSeparators}])`;
};

const degrees = (groupName) => {
    return String.raw`((?<${groupName}>\d{1,3}(\.\d+)?)\s*[\u00B0\u02DA\u00BA\u007E\u002A]?)`;
};

const minutes = (groupName) => {
    return String.raw`((?<${groupName}>\d{1,2}(\.\d+)?)\s*[\u2032\u0027\u02B9]?)`;
};

const seconds = (groupName) => {
    return String.raw`((?<${groupName}>\d{1,2}(\.\d+)?)\s*[\u0022\u00A8\u02DD\u2033]?)`;
};

export const makeRegexDecimalDegrees = () => {
    const regexParts = [
        String.raw`^${hemisphereSign("preA")}?\s*`,
        String.raw`${decimalDegrees("dA")}?\s*`,
        String.raw`${hemisphereSign("postA")}?\s*`,
        String.raw`${separator()}\s*`,
        String.raw`${hemisphereSign("preB")}?\s*`,
        String.raw`${decimalDegrees("dB")}?\s*`,
        String.raw`${hemisphereSign("postB")}?\s*$`,
    ];
    return new RegExp(regexParts.join(""), "i");
};

export const makeRegexDegreesMinSec = () => {
    const regexParts = [
        String.raw`^${hemisphereSign("preA")}?\s*`,
        String.raw`${degrees("dgA")}?\s*`,
        String.raw`${minutes("mA")}?\s*`,
        String.raw`${seconds("sA")}?\s*`,
        String.raw`${hemisphereSign("postA")}?\s*`,
        String.raw`${separator()}\s*`,
        String.raw`${hemisphereSign("preB")}?\s*`,
        String.raw`${degrees("dgB")}?\s*`,
        String.raw`${minutes("mB")}?\s*`,
        String.raw`${seconds("sB")}?\s*`,
        String.raw`${hemisphereSign("postB")}?\s*$`,
    ];
    return new RegExp(regexParts.join(""), "i");
};

export const makeRegexNonSpaceSeparator = () => {
    return new RegExp(String.raw`([${nonSpaceSeparators()}])`.toString(), "i");
};
