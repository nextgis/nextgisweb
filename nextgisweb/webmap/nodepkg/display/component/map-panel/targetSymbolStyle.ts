import { Style } from "ol/style";

const TARGET_SYMBOL_GAP_PX = 3;
const TARGET_SYMBOL_LENGTH_PX = 12;

type PixelExtent = [number, number, number, number];
type PixelCoordinate = [number, number];

function getPixelExtent(coordinates: unknown): PixelExtent {
  const flatCoordinates = (coordinates as unknown[]).flat(Infinity) as number[];
  const extent: PixelExtent = [Infinity, Infinity, -Infinity, -Infinity];

  for (let i = 0; i < flatCoordinates.length; i += 2) {
    const x = flatCoordinates[i];
    const y = flatCoordinates[i + 1];
    extent[0] = Math.min(extent[0], x);
    extent[1] = Math.min(extent[1], y);
    extent[2] = Math.max(extent[2], x);
    extent[3] = Math.max(extent[3], y);
  }

  return extent;
}

export function createTargetSymbolStyle(
  geometryStyle: Style,
  color: string
): Style[] {
  const width = geometryStyle.getStroke()?.getWidth() ?? 1;
  const targetSymbolStyle = new Style({
    renderer: (pixelCoordinates, state) => {
      const geometryType = state.geometry.getType();
      if (geometryType === "Point" || geometryType === "MultiPoint") return;

      let extent = getPixelExtent(pixelCoordinates);

      if (geometryType === "Circle") {
        const [[centerX, centerY], [radiusX, radiusY]] =
          pixelCoordinates as PixelCoordinate[];
        const radius = Math.hypot(radiusX - centerX, radiusY - centerY);
        extent = [
          centerX - radius,
          centerY - radius,
          centerX + radius,
          centerY + radius,
        ];
      }

      const [minX, minY, maxX, maxY] = extent;
      const threshold = TARGET_SYMBOL_LENGTH_PX * (state.pixelRatio * 2);
      if (Math.max(maxX - minX, maxY - minY) > threshold) return;

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const gap = TARGET_SYMBOL_GAP_PX * state.pixelRatio;
      const length = TARGET_SYMBOL_LENGTH_PX * state.pixelRatio;
      const context = state.context;
      const rays = [
        [minX - gap, centerY, -length, 0],
        [maxX + gap, centerY, length, 0],
        [centerX, minY - gap, 0, -length],
        [centerX, maxY + gap, 0, length],
      ];

      context.save();
      context.beginPath();
      for (const [x, y, dx, dy] of rays) {
        context.moveTo(x, y);
        context.lineTo(x + dx, y + dy);
      }
      context.strokeStyle = color;
      context.lineWidth = width * state.pixelRatio;
      context.lineCap = "round";
      context.stroke();
      context.restore();
    },
  });

  return [geometryStyle, targetSymbolStyle];
}
