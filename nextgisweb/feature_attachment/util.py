from pathlib import Path

from PIL.Image import Image


def change_suffix(name: str, suffix: str) -> str:
    p = Path(name)
    if p.suffix == "":
        return name
    if p.suffix.isupper():
        suffix = suffix.upper()
    return str(p.with_suffix(suffix))


def crop_to_aspect_ratio(image: Image, k: float) -> Image:
    dw = dh = 0
    w, h = image.size
    if (w / h) > k:
        dw = (w - h * k) // 2
    else:
        dh = (h - w / k) // 2
    return image.crop((0 + dw, 0 + dh, w - dw, h - dh))
