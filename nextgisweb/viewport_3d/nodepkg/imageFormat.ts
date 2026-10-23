import type ImageFormat from "@giro3d/giro3d/formats/ImageFormat";
import { LinearFilter, Texture, UnsignedByteType } from "three";

export const imageFormat: ImageFormat = {
  isImageFormat: true,
  type: "image",
  flipY: false,
  dataType: UnsignedByteType,
  async decode(blob) {
    const image = await createImageBitmap(blob, {
      imageOrientation: "flipY",
      // Giro3D blends straight RGBA; the browser default premultiplies RGB.
      premultiplyAlpha: "none",
    });
    const texture = new Texture(image);
    texture.flipY = false;
    texture.minFilter = LinearFilter;
    texture.needsUpdate = true;
    texture.addEventListener("dispose", () => image.close());
    return { texture };
  },
};
