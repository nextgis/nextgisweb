from enum import Enum


class CompressionEnum(Enum):
    DEFAULT = "DEFAULT"
    FAST = "FAST"
    BEST = "BEST"


COMPRESSION_DEFAULT = CompressionEnum.DEFAULT
COMPRESSION_FAST = CompressionEnum.FAST
COMPRESSION_BEST = CompressionEnum.BEST


class FormatEnum(Enum):
    PNG = "PNG"
    JPEG = "JPEG"


FORMAT_PNG = FormatEnum.PNG
FORMAT_JPEG = FormatEnum.JPEG


def image_encoder_factory(
    format: FormatEnum,
    compression: CompressionEnum = COMPRESSION_DEFAULT,
):
    p_format = None
    p_force_rgb = False
    p_kwargs = dict()

    if format == FORMAT_PNG:
        p_format = "png"
        if compression == COMPRESSION_DEFAULT:
            p_kwargs["compress_level"] = 6
        elif compression == COMPRESSION_FAST:
            if has_fpng:
                p_format = "fpng"
            else:
                p_kwargs["compress_level"] = 3
        elif compression == COMPRESSION_BEST:
            p_kwargs["compress_level"] = 9
    elif format == FORMAT_JPEG:
        p_format = "jpeg"
        p_force_rgb = True
        if compression == COMPRESSION_DEFAULT:
            p_kwargs["quality"] = 85
        elif compression == COMPRESSION_FAST:
            p_kwargs["quality"] = 75
        elif compression == COMPRESSION_BEST:
            p_kwargs["quality"] = 95
        else:
            raise ValueError(f"invalid compression: {compression}")
    else:
        raise ValueError(f"invalid format: {format}")

    def _encode(img, buf):
        if p_force_rgb and img.mode != "RGB":
            img = img.convert("RGB")
        img.save(buf, format=p_format, **p_kwargs)

    return _encode


def _has_fpng():
    try:
        import pillow_fpng  # noqa: F401
    except ModuleNotFoundError:
        return False
    else:
        return True


has_fpng = _has_fpng()
