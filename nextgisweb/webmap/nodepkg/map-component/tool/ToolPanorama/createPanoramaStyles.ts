import type { Style } from "@nextgisweb/sld/type/api";

export function createPanoramaStyles(): Style {
  const color = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim();

  return {
    rules: [
      {
        symbolizers: [
          {
            type: "point",
            graphic: {
              size: 8,
              mark: {
                well_known_name: "circle",
                fill: { color },
                stroke: { color: "#fff", width: 2 },
              },
            },
          },
          {
            type: "polygon",
            fill: { color, opacity: 0.15 },
            stroke: { color, width: 1.5 },
          },
        ],
      },
    ],
  };
}
