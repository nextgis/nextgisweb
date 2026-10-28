import { asArray, asString } from "ol/color";
import type { Type as OlGeometryType } from "ol/geom/Geometry";
import GeometryCollection from "ol/geom/GeometryCollection";
import { Circle, Fill, Stroke, Style } from "ol/style";
import type { StyleFunction } from "ol/style/Style";

import type {
  Rule,
  Fill as SldFill,
  Stroke as SldStroke,
  Style as SldStyle,
} from "@nextgisweb/sld/type/api";

import { createTargetSymbolStyle } from "./targetSymbolStyle";

interface SldStyleOptions {
  target?: boolean;
  dashPattern?: boolean;
}

function createColor(paint: SldFill): number[] {
  const color = [...asArray(paint.color ?? "#000000")];
  color[3] *= paint.opacity ?? 1;
  return color;
}

function createStroke(
  stroke?: SldStroke,
  dashPattern = false
): Stroke | undefined {
  return stroke
    ? new Stroke({
        color: createColor(stroke),
        width: stroke.width ?? 1,
        lineDash: dashPattern ? stroke.dash_pattern : undefined,
      })
    : undefined;
}

function createFill(fill?: SldFill): Fill | undefined {
  return fill ? new Fill({ color: createColor(fill) }) : undefined;
}

export function createSldStyle(
  style: SldStyle,
  { target = false, dashPattern = false }: SldStyleOptions = {}
): StyleFunction {
  const styles: Partial<Record<Rule["symbolizers"][number]["type"], Style[]>> =
    {};

  for (const symbolizer of style.rules.flatMap((rule) => rule.symbolizers)) {
    if (styles[symbolizer.type]) continue;

    let geometryStyle: Style;
    let stroke: SldStroke | undefined;

    switch (symbolizer.type) {
      case "point": {
        const { graphic } = symbolizer;
        const { mark } = graphic;
        if (mark?.well_known_name !== "circle") continue;

        const image = new Circle({
          stroke: createStroke(mark.stroke, dashPattern),
          fill: createFill(mark.fill),
          radius: (graphic.size ?? 6) / 2,
        });

        image.setOpacity(graphic.opacity ?? 1);
        geometryStyle = new Style({ image });
        break;
      }

      case "line":
        stroke = symbolizer.stroke;
        geometryStyle = new Style({
          stroke: createStroke(stroke, dashPattern),
        });
        break;

      case "polygon":
        stroke = symbolizer.stroke;
        geometryStyle = new Style({
          stroke: createStroke(stroke, dashPattern),
          fill: createFill(symbolizer.fill),
        });
        break;

      default:
        continue;
    }

    styles[symbolizer.type] =
      target && stroke
        ? createTargetSymbolStyle(geometryStyle, asString(createColor(stroke)))
        : [geometryStyle];
  }

  const getStyles = (type: OlGeometryType | undefined): Style[] => {
    switch (type) {
      case "Point":
      case "MultiPoint":
        return styles.point ?? [];

      case "LineString":
      case "MultiLineString":
        return styles.line ?? [];

      case "Polygon":
      case "MultiPolygon":
      case "Circle":
        return styles.polygon ?? [];

      default:
        return [];
    }
  };

  return (feature) => {
    const geometry = feature.getGeometry();

    if (geometry instanceof GeometryCollection) {
      return geometry.getGeometriesArrayRecursive().flatMap((part) =>
        getStyles(part.getType()).map((style) => {
          const copy = style.clone();
          copy.setGeometry(part);
          return copy;
        })
      );
    }

    return getStyles(geometry?.getType());
  };
}
