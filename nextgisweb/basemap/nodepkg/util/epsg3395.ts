import {
    addCoordinateTransforms,
    addProjection,
    get as getProjection,
    getTransform,
} from "ol/proj";
import * as olProj from "ol/proj";

const a = 6378137;
const b = 6356752.3142;
const e = Math.sqrt(1 - (b * b) / (a * a));

function toEPSG3395fromEPSG4326(
    input: number[],
    output?: number[],
    dimension: number = 2
): number[] {
    const length = input.length;

    if (output === undefined) {
        output = dimension > 2 ? input.slice() : new Array(length);
    }

    for (let i = 0; i < length; i += dimension) {
        output[i] = (a * (input[i] * Math.PI)) / 180;
        const phi = (input[i + 1] * Math.PI) / 180;
        const c = Math.pow(
            (1 - e * Math.sin(phi)) / (1 + e * Math.sin(phi)),
            e / 2
        );
        output[i + 1] = a * Math.log(Math.tan(Math.PI / 4 + phi / 2) * c);
    }

    return output;
}

function toEPSG3395fromEPSG3857(
    input: number[],
    output?: number[],
    dimension?: number
): number[] {
    const transform = getTransform("EPSG:3857", "EPSG:4326");
    const transformed = transform(input, output, dimension);
    return toEPSG3395fromEPSG4326(transformed, output, dimension);
}

export function registerEPSG3395Projection(): void {
    if (getProjection("EPSG:3395") !== null) {
        return;
    }

    addProjection(
        new olProj.Projection({
            code: "EPSG:3395",
            units: "m",
            extent: [
                -20037508.342789244, -20037508.342789244, 20037508.342789244,
                20037508.342789244,
            ],
            getPointResolution: (resolution: number, point: number[]) => {
                return resolution / Math.cosh(point[1] / a);
            },
        })
    );

    addCoordinateTransforms(
        "EPSG:3857",
        "EPSG:3395",
        toEPSG3395fromEPSG3857,
        (input: number[]) => {
            console.warn("Handle the inverse transform!");
            return input;
        }
    );
}
