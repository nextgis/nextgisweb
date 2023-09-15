import Color from "color";

export function extractColorAndOpacity(
    hexValue: string
): [colorWithoutAlpha: string, opacity: number] {
    const colorObj = Color(hexValue);
    const opacity = Math.round(colorObj.alpha() * 100) / 100;

    const colorWithoutAlpha = colorObj.alpha(1).hex();

    return [colorWithoutAlpha, opacity];
}
