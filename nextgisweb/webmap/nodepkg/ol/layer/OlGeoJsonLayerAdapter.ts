import type Feature from "ol/Feature";
import { asArray, asString } from "ol/color";
import type { Geometry } from "ol/geom";
import GeometryCollection from "ol/geom/GeometryCollection";
import { Circle, Fill, Stroke, Style } from "ol/style";

import type {
  Fill as SldFill,
  Stroke as SldStroke,
  Style as SldStyle,
} from "@nextgisweb/sld/type/api";
import type {
  GeoJsonLayerAdapter,
  GeoJsonLayerOptions,
} from "@nextgisweb/webmap/layer-adapter/type";

import Vector from "./Vector";
import { createTargetSymbolStyle } from "./targetSymbolStyle";

function createColor(paint: SldFill): number[] {
  const color = [...asArray(paint.color ?? "#000000")];
  color[3] *= paint.opacity ?? 1;
  return color;
}

function createStroke(stroke?: SldStroke): Stroke | undefined {
  return stroke
    ? new Stroke({ color: createColor(stroke), width: stroke.width ?? 1 })
    : undefined;
}

function createFill(fill?: SldFill): Fill | undefined {
  return fill ? new Fill({ color: createColor(fill) }) : undefined;
}

export class OlGeoJsonLayerAdapter
  extends Vector
  implements GeoJsonLayerAdapter
{
  private disposed = false;
  private readonly target: boolean;

  constructor(options: GeoJsonLayerOptions) {
    super(options.name, {
      title: options.title,
      visible: options.visible,
      opacity: options.opacity,
      isTopLayer: options.isTopLayer,
    });
    if (options.isBaseLayer) this.isBaseLayer = true;
    this.target = options.target ?? false;
  }

  setFeatures(features: Feature<Geometry>[]): void {
    if (this.disposed) return;
    this.olSource.clear();
    this.olSource.addFeatures(features);
  }

  setStyle(style: SldStyle): void {
    if (this.disposed) return;
    const styles: Record<string, Style[]> = {};
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
            stroke: createStroke(mark.stroke),
            fill: createFill(mark.fill),
            radius: (graphic.size ?? 6) / 2,
          });
          image.setOpacity(graphic.opacity ?? 1);
          geometryStyle = new Style({ image });
          break;
        }
        case "line":
          stroke = symbolizer.stroke;
          geometryStyle = new Style({ stroke: createStroke(stroke) });
          break;
        case "polygon":
          stroke = symbolizer.stroke;
          geometryStyle = new Style({
            stroke: createStroke(stroke),
            fill: createFill(symbolizer.fill),
          });
          break;
        default:
          continue;
      }
      styles[symbolizer.type] =
        this.target && stroke
          ? createTargetSymbolStyle(
              geometryStyle,
              asString(createColor(stroke))
            )
          : [geometryStyle];
    }

    const getStyles = (type: string | undefined): Style[] => {
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
    this.olLayer.setStyle((feature) => {
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
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.olSource.clear();
    super.dispose();
  }
}
