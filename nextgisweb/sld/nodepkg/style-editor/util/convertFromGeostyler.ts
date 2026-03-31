import type {
  FillSymbolizer as GSFillSymbolizer,
  LineSymbolizer as GSLineSymbolizer,
  MarkSymbolizer as GSMarkSymbolizer,
  Symbolizer as GSSymbolizer,
  TextSymbolizer as GSTextSymbolizer,
  GeoStylerNumberFunction,
} from "geostyler-style";

import { deepCleanUndefined } from "@nextgisweb/gui/util/deepCleanUndefined";
import type {
  LineSymbolizer,
  PointSymbolizer,
  PolygonSymbolizer,
  TextSymbolizer,
  WellKnownName,
} from "@nextgisweb/sld/type/api";

import type { Symbolizer } from "../type/Style";

const setOpacity = (
  v: number | GeoStylerNumberFunction | undefined
): number | undefined => (v !== 1 ? (v as number) : undefined);

function convertMarkSymbolizer(gsMark: GSMarkSymbolizer): PointSymbolizer {
  return {
    type: "point",
    graphic: {
      mark: {
        well_known_name: gsMark.wellKnownName as WellKnownName,
        fill: gsMark.color
          ? {
              color: gsMark.color as string,
              opacity: setOpacity(gsMark.fillOpacity || gsMark.opacity),
            }
          : {},
        stroke: gsMark.strokeColor
          ? {
              color: gsMark.strokeColor as string,
              opacity: setOpacity(gsMark.strokeOpacity),
              width: gsMark.strokeWidth as number,
            }
          : undefined,
      },
      opacity: setOpacity(gsMark.opacity),
      size: (gsMark.radius as number) * 2,
    },
  };
}

function convertLineSymbolizer(gsLine: GSLineSymbolizer): LineSymbolizer {
  return {
    type: "line",
    stroke: {
      color: gsLine.color as string,
      width: gsLine.width as number,
      opacity: setOpacity(gsLine.opacity),
      dash_pattern: gsLine?.dasharray as number[],
    },
  };
}

function convertFillSymbolizer(gsFill: GSFillSymbolizer): PolygonSymbolizer {
  const fillOpacity = setOpacity(gsFill.fillOpacity || gsFill.opacity);

  return {
    type: "polygon",
    fill: gsFill.color
      ? {
          color: gsFill.color as string,
          opacity: fillOpacity,
        }
      : undefined,
    stroke: gsFill.outlineColor
      ? {
          color: gsFill.outlineColor as string,
          width: gsFill.outlineWidth as number,
          opacity: setOpacity(gsFill.outlineOpacity),
          dash_pattern: gsFill.outlineDasharray as number[],
        }
      : undefined,
  };
}

function convertTextSymbolizer(gsFill: GSTextSymbolizer): TextSymbolizer {
  const fillOpacity = setOpacity(gsFill.opacity);

  return {
    type: "text",
    fill: gsFill.color
      ? {
          color: String(gsFill.color),
          opacity: fillOpacity,
        }
      : undefined,
    font_size: Number(gsFill.size),
    field: String(gsFill.label),
  };
}

export function convertFromGeostyler(
  gsSymbolizer: GSSymbolizer
): Symbolizer | null {
  switch (gsSymbolizer.kind) {
    case "Mark":
      return deepCleanUndefined(convertMarkSymbolizer(gsSymbolizer));
    case "Line":
      return deepCleanUndefined(convertLineSymbolizer(gsSymbolizer));
    case "Fill":
      return deepCleanUndefined(convertFillSymbolizer(gsSymbolizer));
    case "Text":
      return deepCleanUndefined(convertTextSymbolizer(gsSymbolizer));
    default:
      return null;
  }
}
