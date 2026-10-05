import ImageFormat from "@giro3d/giro3d/formats/ImageFormat.js";
import type {
  DecodeOptions,
  DecodeResult,
} from "@giro3d/giro3d/formats/ImageFormat.js";
import { DataTexture, FloatType, LinearFilter, RGFormat } from "three";

/**
 * Decoder of Terrarium encoded elevation tiles
 *
 * Giro3D has a decoder for Mapbox Terrain-RGB only, this one follows it but
 * uses Terrarium encoding: elevation = R * 256 + G + B / 256 - 32768. Tiles are
 * small, so they are decoded in the main thread.
 */
export class TerrariumFormat extends ImageFormat {
  override readonly type = "TerrariumFormat";

  constructor() {
    super(true, FloatType);
  }

  async decode(blob: Blob, options?: DecodeOptions): Promise<DecodeResult> {
    const image = await createImageBitmap(blob);
    const { width, height } = image;

    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Unable to acquire 2D canvas context");
    context.drawImage(image, 0, 0);
    image.close();
    const pixels = context.getImageData(0, 0, width, height).data;

    // Elevation and validity (used as alpha) for each pixel
    const data = new Float32Array(width * height * 2);
    const noData = options?.noDataValue;
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0, k = 0; i < pixels.length; i += 4, k += 2) {
      const elevation =
        pixels[i] * 256 + pixels[i + 1] + pixels[i + 2] / 256 - 32768;
      data[k] = elevation;
      if (elevation !== noData) {
        data[k + 1] = 1;
        min = Math.min(min, elevation);
        max = Math.max(max, elevation);
      }
    }

    const texture = new DataTexture(data, width, height, RGFormat, FloatType);
    texture.needsUpdate = true;
    texture.generateMipmaps = false;
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearFilter;

    return { texture, min, max };
  }
}
