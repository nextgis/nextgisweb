import Color from "color";
import type {
    GeoStylerNumberFunction,
    GeoStylerStringFunction,
} from "geostyler-style";

export function hexWithOpacity(
    hexColor?: string | GeoStylerStringFunction,
    opacity?: number | GeoStylerNumberFunction
): string | undefined {
    if (typeof hexColor !== "string") {
        return undefined;
    }
    if (typeof opacity !== "number") {
        return hexColor;
    }
    const color = Color(hexColor);
    const colorWithAlpha = color.alpha(opacity);

    return colorWithAlpha.hexa();
}
