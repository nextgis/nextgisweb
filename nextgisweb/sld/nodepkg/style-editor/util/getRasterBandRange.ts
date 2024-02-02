export function getRasterBandRange(dtype: string) {
    let bandRange;
    switch (dtype) {
        case "Int16":
            bandRange = { min: -32268, max: 32767 };
            break;
        case "Int32":
            bandRange = { min: -2147483648, max: 2147483647 };
            break;
        case "UInt16":
            bandRange = { min: 0, max: 65535 };
            break;
        case "UInt32":
            bandRange = { min: 0, max: 4294967295 };
            break;
        default:
            bandRange = { min: 0, max: 255 };
            break;
    }
    return bandRange;
}
