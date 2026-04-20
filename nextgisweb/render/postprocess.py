from __future__ import annotations

from hashlib import blake2b
from typing import Annotated, Any, cast

import numpy as np
from msgspec import Meta, Struct, to_builtins
from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageOps

from nextgisweb.env import gettext

from nextgisweb.resource import SAttribute, Serializer

_PresetConfig = dict[str, float | str]


class RenderPostprocess(Struct, kw_only=True):
    brightness: Annotated[float, Meta(ge=0.0, le=4.0)] | None = None
    contrast: Annotated[float, Meta(ge=0.0, le=4.0)] | None = None
    gamma: Annotated[float, Meta(ge=0.1, le=4.0)] | None = None
    saturation: Annotated[float, Meta(ge=0.0, le=4.0)] | None = None
    sharpen: Annotated[float, Meta(ge=0.0, le=4.0)] | None = None
    blur_radius: Annotated[float, Meta(ge=0.0, le=16.0)] | None = None
    grayscale: bool | None = None
    invert: bool | None = None
    tint_strength: Annotated[float, Meta(ge=0.0, le=1.0)] | None = None
    tint_color: str | None = None
    paper_texture: Annotated[float, Meta(ge=0.0, le=1.0)] | None = None
    wet_wash: Annotated[float, Meta(ge=0.0, le=1.0)] | None = None
    rough_edges: Annotated[float, Meta(ge=0.0, le=1.0)] | None = None
    pigment_overlay: Annotated[float, Meta(ge=0.0, le=1.0)] | None = None
    pencil_sketch: Annotated[float, Meta(ge=0.0, le=1.0)] | None = None
    wet_edge: Annotated[float, Meta(ge=0.0, le=1.0)] | None = None
    grain: Annotated[float, Meta(ge=0.0, le=1.0)] | None = None
    pastel_softness: Annotated[float, Meta(ge=0.0, le=1.0)] | None = None
    hatching: Annotated[float, Meta(ge=0.0, le=1.0)] | None = None
    seed: Annotated[int, Meta(ge=0, le=2147483647)] | None = None


class PostprocessPresetDefinition(Struct, kw_only=True):
    key: str
    label: str
    postprocess: RenderPostprocess


class PostprocessAttr(SAttribute):
    def get(self, srlzr: Serializer) -> RenderPostprocess | None:
        return getattr(srlzr.obj, self.model_attr)

    def set(self, srlzr: Serializer, value: RenderPostprocess | None, *, create: bool):
        setattr(srlzr.obj, self.model_attr, value)


class PostprocessPresetsAttr(SAttribute):
    def get(self, srlzr: Serializer) -> tuple[PostprocessPresetDefinition, ...]:
        return get_postprocess_presets()

    def set(
        self,
        srlzr: Serializer,
        value: tuple[PostprocessPresetDefinition, ...] | None,
        *,
        create: bool,
    ):
        raise AttributeError("Postprocess presets are read-only")


_WATERCOLOR_PRESET: _PresetConfig = dict(
    brightness=1.02,
    contrast=0.95,
    saturation=0.78,
    blur_radius=1.6,
    paper_texture=0.34,
    wet_wash=0.48,
    rough_edges=0.28,
    pigment_overlay=0.42,
)

_INK_SKETCH_PRESET: _PresetConfig = dict(
    contrast=1.3,
    saturation=0.1,
    sharpen=1.8,
    blur_radius=0.3,
    rough_edges=0.18,
    pigment_overlay=0.1,
)

_BLUEPRINT_PRESET: _PresetConfig = dict(
    brightness=0.92,
    contrast=1.2,
    saturation=0.15,
    sharpen=1.2,
    tint_strength=0.75,
    tint_color="#2f5fa8",
    paper_texture=0.12,
)

_VINTAGE_MAP_PRESET: _PresetConfig = dict(
    brightness=1.04,
    contrast=0.92,
    saturation=0.72,
    gamma=1.08,
    tint_strength=0.35,
    tint_color="#c89a5b",
    paper_texture=0.22,
    pigment_overlay=0.16,
)

_POSTPROCESS_PRESETS = (
    PostprocessPresetDefinition(
        key="watercolor",
        label=str(gettext("Watercolor")),
        postprocess=RenderPostprocess(**cast(dict[str, Any], _WATERCOLOR_PRESET)),
    ),
    PostprocessPresetDefinition(
        key="ink_sketch",
        label=str(gettext("Ink sketch")),
        postprocess=RenderPostprocess(**cast(dict[str, Any], _INK_SKETCH_PRESET)),
    ),
    PostprocessPresetDefinition(
        key="blueprint",
        label=str(gettext("Blueprint")),
        postprocess=RenderPostprocess(**cast(dict[str, Any], _BLUEPRINT_PRESET)),
    ),
    PostprocessPresetDefinition(
        key="vintage_map",
        label=str(gettext("Vintage map")),
        postprocess=RenderPostprocess(**cast(dict[str, Any], _VINTAGE_MAP_PRESET)),
    ),
)

_MIX = (
    (127.1, 311.7),
    (269.5, 183.3),
    (419.2, 371.9),
)


def _apply_displacement_np(array, extent, size, seed, strength):
    h, w = array.shape[:2]
    dx = (_world_noise(extent, size, seed, offset=101) - 0.5) * strength
    dy = (_world_noise(extent, size, seed, offset=202) - 0.5) * strength

    y_idx, x_idx = np.indices((h, w), dtype=np.float32)

    map_x = np.clip(x_idx + dx, 0, w - 1.001)
    map_y = np.clip(y_idx + dy, 0, h - 1.001)

    x0 = map_x.astype(np.int32)
    x1 = x0 + 1
    y0 = map_y.astype(np.int32)
    y1 = y0 + 1

    wa = ((x1 - map_x) * (y1 - map_y))[:, :, np.newaxis]
    wb = ((x1 - map_x) * (map_y - y0))[:, :, np.newaxis]
    wc = ((map_x - x0) * (y1 - map_y))[:, :, np.newaxis]
    wd = ((map_x - x0) * (map_y - y0))[:, :, np.newaxis]

    return array[y0, x0] * wa + array[y1, x0] * wb + array[y0, x1] * wc + array[y1, x1] * wd


def get_postprocess_presets() -> tuple[PostprocessPresetDefinition, ...]:
    return _POSTPROCESS_PRESETS


def _resolve_postprocess(postprocess: RenderPostprocess | None):
    if postprocess is None:
        return None

    resolved: dict[str, float | bool | str | None | int] = {
        "brightness": 1.0,
        "contrast": 1.0,
        "gamma": 1.0,
        "saturation": 1.0,
        "sharpen": 0.0,
        "blur_radius": 0.0,
        "grayscale": False,
        "invert": False,
        "tint_strength": 0.0,
        "tint_color": None,
        "wet_wash": 0.0,
        "paper_texture": 0.0,
        "pigment_overlay": 0.0,
        "rough_edges": 0.0,
        "pencil_sketch": 0.0,
        "wet_edge": 0.0,
        "grain": 0.0,
        "pastel_softness": 0.0,
        "hatching": 0.0,
        "seed": 42,
    }

    user_data = to_builtins(postprocess)

    if isinstance(user_data, dict):
        for key, value in user_data.items():
            if value is not None and key in resolved:
                resolved[key] = value

    return resolved


def _is_noop_postprocess(resolved) -> bool:
    return (
        resolved["brightness"] == 1.0
        and resolved["contrast"] == 1.0
        and resolved["gamma"] == 1.0
        and resolved["saturation"] == 1.0
        and resolved["sharpen"] == 0.0
        and resolved["blur_radius"] == 0.0
        and not resolved["grayscale"]
        and not resolved["invert"]
        and resolved["tint_strength"] == 0.0
        and resolved["paper_texture"] == 0.0
        and resolved["wet_wash"] == 0.0
        and resolved["rough_edges"] == 0.0
        and resolved["pigment_overlay"] == 0.0
        and resolved["pencil_sketch"] == 0.0
        and resolved["wet_edge"] == 0.0
        and resolved["grain"] == 0.0
        and resolved["pastel_softness"] == 0.0
        and resolved["hatching"] == 0.0
    )


def _apply_gamma(img: Image.Image, gamma: float) -> Image.Image:
    inv_gamma = 1.0 / gamma
    lut = [int(max(0, min(255, pow(i / 255.0, inv_gamma) * 255.0))) for i in range(256)]
    r, g, b, a = img.split()
    return Image.merge("RGBA", (r.point(lut), g.point(lut), b.point(lut), a))


def _hex_to_rgb(value: str) -> tuple[int, int, int] | None:
    if not isinstance(value, str):
        return None

    color = value.strip()
    if len(color) != 7 or not color.startswith("#"):
        return None

    try:
        return (
            int(color[1:3], 16),
            int(color[3:5], 16),
            int(color[5:7], 16),
        )
    except ValueError:
        return None


def _apply_tint(img: Image.Image, color: str | None, strength: float) -> Image.Image:
    rgb = _hex_to_rgb(color) if color else None
    if rgb is None or strength <= 0.0:
        return img

    overlay = Image.new("RGBA", img.size, (*rgb, 255))
    mixed = Image.blend(img, overlay, strength)
    r, g, b, _ = mixed.split()
    alpha = img.getchannel("A")
    return Image.merge("RGBA", (r, g, b, alpha))


def apply_postprocess_local(
    img: Image.Image | None,
    postprocess: RenderPostprocess | None,
    *,
    extent: tuple[float, float, float, float] | None = None,
) -> Image.Image | None:
    if img is None:
        return None

    resolved = _resolve_postprocess(postprocess)
    if resolved is None or _is_noop_postprocess(resolved):
        return img

    if img.mode != "RGBA":
        img = img.convert("RGBA")

    if resolved["sharpen"] > 0.0:
        img = ImageEnhance.Sharpness(img).enhance(1.0 + resolved["sharpen"])

    if resolved.get("wet_wash", 0) > 0.0:
        wash_radius = max(1.0, resolved.get("blur_radius", 0) + resolved["wet_wash"] * 3.0)
        wash = img.filter(ImageFilter.GaussianBlur(radius=wash_radius))
        wash_alpha = min(0.7, 0.12 + resolved["wet_wash"] * 0.45)
        img = Image.blend(img, wash, wash_alpha)
    elif resolved.get("blur_radius", 0) > 0.0:
        img = img.filter(ImageFilter.GaussianBlur(radius=resolved["blur_radius"]))

    if resolved.get("pencil_sketch", 0.0) > 0.0:
        strength = resolved["pencil_sketch"]
        noise_extent = extent or (0.0, 0.0, float(img.width), float(img.height))

        alpha = img.getchannel("A")
        gray = ImageOps.grayscale(img.convert("RGB"))

        gray_smooth = gray.filter(ImageFilter.SMOOTH_MORE)

        dodge_radius = max(1.0, 2.0 + strength * 8.0)
        blurred = gray_smooth.filter(ImageFilter.GaussianBlur(radius=dodge_radius))
        gray_f = np.asarray(gray, dtype=np.float32)
        blurred_f = np.asarray(blurred, dtype=np.float32)
        sketch_f = np.clip(gray_f * 256.0 / np.maximum(blurred_f, 1.0), 0.0, 255.0)
        sketch = Image.fromarray(sketch_f.astype(np.uint8), mode="L")

        if resolved.get("paper_texture", 0.0) > 0.0:
            paper = _world_noise(noise_extent, img.size, resolved["seed"], offset=11)
            sketch_f = np.asarray(sketch, dtype=np.float32)
            factor = 1.0 + (paper - 0.5) * resolved["paper_texture"] * 0.3
            sketch_f = np.clip(sketch_f * factor, 0.0, 255.0)
            sketch = Image.fromarray(sketch_f.astype(np.uint8), mode="L")

        sketch_rgba = Image.merge("RGBA", (sketch, sketch, sketch, alpha))
        img = Image.blend(img, sketch_rgba, strength)

    if resolved.get("wet_edge", 0.0) > 0.0:
        strength = resolved["wet_edge"]
        noise_extent = extent or (0.0, 0.0, float(img.width), float(img.height))

        smoothed = img.filter(ImageFilter.MedianFilter(5))

        capillary = smoothed
        for i in range(3):
            diffused = capillary.filter(ImageFilter.SMOOTH_MORE)
            capillary = Image.blend(capillary, diffused, 0.25 + i * 0.15)

        img = Image.blend(img, capillary, strength * 0.65)

        alpha = img.getchannel("A")
        rgb = img.convert("RGB")
        edge_map = rgb.filter(ImageFilter.FIND_EDGES)
        base_f = np.asarray(rgb, dtype=np.float32)
        edge_f = np.asarray(edge_map, dtype=np.float32)
        darkened_f = base_f * (1.0 - (edge_f / 255.0) * strength * 0.9)
        darkened_f = np.clip(darkened_f, 0.0, 255.0).astype(np.uint8)
        r, g, b = Image.fromarray(darkened_f).split()
        img = Image.merge("RGBA", (r, g, b, alpha))

        paper = _world_noise(noise_extent, img.size, resolved["seed"], offset=11)
        arr = np.asarray(img, dtype=np.float32).copy()
        alpha_f = arr[:, :, 3:4] / 255.0
        factor = 1.0 + (paper - 0.5)[:, :, np.newaxis] * strength * 0.3
        arr[:, :, :3] *= 1.0 + alpha_f * (factor - 1.0)
        arr = np.clip(arr, 0.0, 255.0).astype(np.uint8)
        img = Image.fromarray(arr)

    if resolved.get("pastel_softness", 0.0) > 0.0:
        strength = resolved["pastel_softness"]

        softened = img.filter(ImageFilter.GaussianBlur(radius=1.5 * strength))
        img = Image.blend(img, softened, strength * 0.6)

        img = img.filter(
            ImageFilter.UnsharpMask(radius=1, percent=int(80 + strength * 40), threshold=3)
        )

        img = ImageEnhance.Color(img).enhance(1.0 + strength * 0.2)

        if strength > 0.1:
            alpha = img.getchannel("A")
            rgb = img.convert("RGB")
            edges = rgb.filter(ImageFilter.FIND_EDGES)
            base_f = np.asarray(rgb, dtype=np.float32)
            edge_f = np.asarray(edges, dtype=np.float32)
            conte_f = base_f * (1.0 - (edge_f / 255.0) * strength * 0.35)
            conte_f = np.clip(conte_f, 0.0, 255.0).astype(np.uint8)
            r, g, b = Image.fromarray(conte_f).split()
            img = Image.merge("RGBA", (r, g, b, alpha))

    if resolved.get("rough_edges", 0) > 0.0:
        noise_extent = extent or (0.0, 0.0, float(img.width), float(img.height))
        img_size = img.size
        array = np.asarray(img, dtype=np.float32).copy()

        warp_strength = resolved["rough_edges"] * 12.0
        array = _apply_displacement_np(
            array, noise_extent, img_size, resolved["seed"], warp_strength
        )

        alpha_img = Image.fromarray(array[:, :, 3].astype(np.uint8))
        border_outer = alpha_img.filter(ImageFilter.MaxFilter(5))
        border_inner = alpha_img.filter(ImageFilter.MinFilter(3))
        border = (
            np.asarray(ImageChops.subtract(border_outer, border_inner), dtype=np.float32) / 255.0
        )
        border = border[:, :, np.newaxis]

        edge_noise = _world_noise(noise_extent, img_size, resolved["seed"], offset=53)[
            :, :, np.newaxis
        ]

        fringe_strength = resolved["rough_edges"] * 0.6
        array[:, :, :3] *= 1.0 - border * fringe_strength * (0.7 + edge_noise * 0.3)

        alpha_erosion = border * resolved["rough_edges"] * (0.4 + edge_noise)
        array[:, :, 3:4] *= 1.0 - alpha_erosion * 0.8

        array = np.clip(array, 0.0, 255.0).astype(np.uint8)
        img = Image.fromarray(array)

    return img


def apply_postprocess_world(
    img: Image.Image | None,
    postprocess: RenderPostprocess | None,
    *,
    extent: tuple[float, float, float, float] | None = None,
) -> Image.Image | None:
    if img is None:
        return None

    resolved = _resolve_postprocess(postprocess)
    if resolved is None or _is_noop_postprocess(resolved):
        return img

    if img.mode != "RGBA":
        img = img.convert("RGBA")

    if resolved["brightness"] != 1.0:
        img = ImageEnhance.Brightness(img).enhance(resolved["brightness"])

    if resolved["contrast"] != 1.0:
        factor = resolved["contrast"]
        lut = [int(max(0, min(255, (i - 127.5) * factor + 127.5))) for i in range(256)]
        r, g, b, a = img.split()
        img = Image.merge("RGBA", (r.point(lut), g.point(lut), b.point(lut), a))

    if resolved["gamma"] != 1.0:
        img = _apply_gamma(img, resolved["gamma"])

    if resolved["saturation"] != 1.0:
        img = ImageEnhance.Color(img).enhance(resolved["saturation"])

    if resolved["grayscale"]:
        alpha = img.getchannel("A")
        gray = ImageOps.grayscale(img.convert("RGB"))
        img = Image.merge("RGBA", (gray, gray, gray, alpha))

    if resolved["invert"]:
        alpha = img.getchannel("A")
        rgb = ImageOps.invert(img.convert("RGB"))
        r, g, b = rgb.split()
        img = Image.merge("RGBA", (r, g, b, alpha))

    if resolved["tint_strength"] > 0.0 and resolved["tint_color"]:
        img = _apply_tint(img, resolved["tint_color"], resolved["tint_strength"])

    if resolved.get("paper_texture", 0) > 0.0 or resolved.get("pigment_overlay", 0) > 0.0:
        noise_extent = extent or (0.0, 0.0, float(img.width), float(img.height))
        img_size = img.size
        array = np.asarray(img, dtype=np.float32).copy()
        alpha = array[:, :, 3:4] / 255.0

        if resolved.get("paper_texture", 0) > 0.0:
            paper = _world_noise(noise_extent, img_size, resolved["seed"], offset=11)
            factor = 1.0 + (paper - 0.5)[:, :, np.newaxis] * resolved["paper_texture"] * 0.4
            array[:, :, :3] *= 1.0 - alpha * 0.05 * resolved["paper_texture"]
            array[:, :, :3] *= 1.0 + alpha * (factor - 1.0)

        if resolved.get("pigment_overlay", 0) > 0.0:
            pigment = _world_noise(noise_extent, img_size, resolved["seed"], offset=29)
            density = 1.0 + (pigment - 0.5)[:, :, np.newaxis] * resolved["pigment_overlay"] * 0.5
            array[:, :, :3] *= 1.0 + alpha * (density - 1.0)

        array = np.clip(array, 0.0, 255.0).astype(np.uint8)
        img = Image.fromarray(array)

    if resolved.get("hatching", 0.0) > 0.0:
        strength = resolved["hatching"]
        noise_extent = extent or (0.0, 0.0, float(img.width), float(img.height))
        xe0, ye0, xe1, ye1 = noise_extent
        width, height = img.size

        dx = (xe1 - xe0) / max(width, 1)
        dy = (ye1 - ye0) / max(height, 1)

        xs = np.linspace(xe0 + dx * 0.5, xe1 - dx * 0.5, width, dtype=np.float64)
        ys = np.linspace(ye1 - dy * 0.5, ye0 + dy * 0.5, height, dtype=np.float64)
        xx, yy = np.meshgrid(xs, ys)

        spacing_world = dx * 8.0

        gray_arr = np.asarray(ImageOps.grayscale(img.convert("RGB")), dtype=np.float32) / 255.0

        max_fill = strength * 0.7
        line_density = (1.0 - gray_arr) * max_fill

        hatch = (xx + yy) / spacing_world
        hatch_mask = (hatch - np.floor(hatch)) < line_density

        cross_threshold = max_fill * 0.5
        hatch2 = (xx - yy) / spacing_world
        hatch2_mask = ((hatch2 - np.floor(hatch2)) < line_density) & (
            line_density > cross_threshold
        )

        ink_mask = (hatch_mask | hatch2_mask)[:, :, np.newaxis]

        arr = np.asarray(img, dtype=np.float32).copy()
        alpha_f = arr[:, :, 3:4] / 255.0

        darken = ink_mask.astype(np.float32) * strength * 0.85
        arr[:, :, :3] *= 1.0 - alpha_f * darken
        arr = np.clip(arr, 0.0, 255.0).astype(np.uint8)
        img = Image.fromarray(arr)

    if resolved.get("grain", 0.0) > 0.0:
        noise_extent = extent or (0.0, 0.0, float(img.width), float(img.height))
        grain_noise = _world_noise(noise_extent, img.size, resolved["seed"], offset=67)
        arr = np.asarray(img, dtype=np.float32).copy()
        alpha_f = arr[:, :, 3:4] / 255.0

        grain_f = (grain_noise - 0.5)[:, :, np.newaxis] * resolved["grain"] * 40.0
        arr[:, :, :3] = np.clip(arr[:, :, :3] + grain_f * alpha_f, 0.0, 255.0)
        arr = np.clip(arr, 0.0, 255.0).astype(np.uint8)
        img = Image.fromarray(arr)

    return img


def apply_postprocess(
    img: Image.Image | None,
    postprocess: RenderPostprocess | None,
    *,
    extent: tuple[float, float, float, float] | None = None,
) -> Image.Image | None:
    """Apply all postprocessing: Category B (local) then Category A (world).

    For tile rendering, prefer calling :func:`apply_postprocess_local` on the
    padded render before cropping, and :func:`apply_postprocess_world` on the
    cropped tile afterwards.
    """
    img = apply_postprocess_local(img, postprocess, extent=extent)
    return apply_postprocess_world(img, postprocess, extent=extent)


def _world_noise(
    extent: tuple[float, float, float, float],
    size: tuple[int, int],
    seed: int,
    *,
    offset: int,
) -> np.ndarray:
    width, height = size
    x0, y0, x1, y1 = extent
    dx = (x1 - x0) / max(width, 1)
    dy = (y1 - y0) / max(height, 1)

    xs = np.linspace(x0 + dx * 0.5, x1 - dx * 0.5, width, dtype=np.float64)
    ys = np.linspace(y1 - dy * 0.5, y0 + dy * 0.5, height, dtype=np.float64)
    xx, yy = np.meshgrid(xs, ys)

    values = _seed_values(seed + offset)
    scales = (
        1.0 / (3200.0 + values[0] * 37.0),
        1.0 / (7800.0 + values[1] * 71.0),
        1.0 / (12800.0 + values[2] * 97.0),
    )

    noise = np.zeros((height, width), dtype=np.float64)
    max_theoretical_amplitude = 0.0

    for idx, scale in enumerate(scales):
        weight = 1.0 / (idx + 1)
        ax, ay = _MIX[idx]
        phase = values[3 + idx] / 255.0 * 1000.0
        mixed = np.sin(xx * scale * ax + yy * scale * ay + phase) * 43758.5453
        noise += weight * (mixed - np.floor(mixed)) * 2.0 - 1.0
        max_theoretical_amplitude += weight

    if max_theoretical_amplitude > 0:
        noise = (noise / max_theoretical_amplitude + 1.0) * 0.5

    return noise.astype(np.float32)


def _seed_values(seed: int) -> tuple[int, ...]:
    digest = blake2b(str(seed).encode("ascii"), digest_size=16).digest()
    return tuple(digest)
