from types import SimpleNamespace

import pytest
from PIL import Image
from zope.interface import implementer

from nextgisweb.core.exception import ValidationError

from .. import api
from ..interface import IRenderableStyle
from ..postprocess import (
    PostprocessPreset,
    RenderPostprocess,
    apply_postprocess,
    merge_postprocess,
)


def test_process_postprocess():
    result = api.process_postprocess(
        {1: '{"brightness": 1.1, "contrast": 1.2, "preset": "watercolor"}'}
    )

    assert result == {
        1: RenderPostprocess(
            preset=PostprocessPreset.WATERCOLOR,
            brightness=1.1,
            contrast=1.2,
        )
    }


def test_process_postprocess_invalid():
    with pytest.raises(ValidationError):
        api.process_postprocess({1: '{"contrast": "bad"}'})


def test_process_postprocess_nullable_constrained_fields():
    result = api.process_postprocess({1: '{"contrast": null, "blur_radius": 2.5}'})

    assert result == {1: RenderPostprocess(contrast=None, blur_radius=2.5)}


def test_process_postprocess_invalid_numeric_bounds():
    with pytest.raises(ValidationError):
        api.process_postprocess({1: '{"contrast": 4.1}'})


def test_process_postprocess_invalid_gamma_bounds():
    with pytest.raises(ValidationError):
        api.process_postprocess({1: '{"gamma": 0.05}'})


def test_merge_postprocess_preset_and_override_priority():
    result = merge_postprocess(
        RenderPostprocess(preset=PostprocessPreset.BLUEPRINT, tint_strength=0.6),
        RenderPostprocess(contrast=1.4, tint_strength=0.2),
    )

    assert result == RenderPostprocess(
        preset=PostprocessPreset.BLUEPRINT,
        tint_strength=0.2,
        contrast=1.4,
    )


def test_apply_postprocess_resolves_preset_then_explicit_override():
    img = Image.new("RGBA", (1, 1), (100, 50, 20, 255))

    result = apply_postprocess(
        img,
        RenderPostprocess(
            preset=PostprocessPreset.BLUEPRINT,
            tint_color="#ff0000",
            tint_strength=1.0,
            grayscale=True,
            paper_texture=0.0,
        ),
    )

    assert result is not None
    assert result.getpixel((0, 0))[:3] == (255, 0, 0)


def test_apply_postprocess_grayscale_and_invert_keep_alpha():
    img = Image.new("RGBA", (1, 1), (10, 40, 90, 128))

    result = apply_postprocess(
        img,
        RenderPostprocess(grayscale=True, invert=True),
    )

    assert result is not None
    pixel = result.getpixel((0, 0))
    assert pixel[0] == pixel[1] == pixel[2]
    assert pixel[3] == 128


def test_apply_postprocess_identity_values_keep_original_image():
    img = Image.new("RGB", (1, 1), (10, 40, 90))

    result = apply_postprocess(
        img,
        RenderPostprocess(
            brightness=1.0,
            contrast=1.0,
            gamma=1.0,
            saturation=1.0,
            sharpen=0.0,
            blur_radius=0.0,
            grayscale=False,
            invert=False,
            tint_strength=0.0,
            paper_texture=0.0,
            wet_wash=0.0,
            rough_edges=0.0,
            pigment_overlay=0.0,
            pencil_sketch=0.0,
            wet_edge=0.0,
            grain=0.0,
            pastel_softness=0.0,
            hatching=0.0,
        ),
    )

    assert result is img
    assert result.mode == "RGB"


def test_tile_postprocess_override_bypasses_cache(monkeypatch):
    class FakeTileCache:
        enabled = True
        max_z = None

        def __init__(self):
            self.get_calls = []
            self.put_calls = []

        def get_tile(self, zxy):
            self.get_calls.append(zxy)
            return True, Image.new("RGBA", (256, 256), (1, 2, 3, 255))

        def put_tile(self, zxy, img):
            self.put_calls.append((zxy, img))
            return True

    @implementer(IRenderableStyle)
    class FakeStyle:
        tile_cache = FakeTileCache()
        id = 1

        def __init__(self):
            self.render_conds = []

        def render_request(self, srs, cond=None):
            self.render_conds.append(cond)

            class FakeRenderRequest:
                def render_tile(self, tile, size):
                    return Image.new("RGBA", (size, size), (255, 0, 0, 255))

            return FakeRenderRequest()

    style = FakeStyle()

    class FilterBy:
        def one_or_none(self):
            return style

        def one(self):
            return SimpleNamespace(id=3857)

    monkeypatch.setattr(api.Resource, "filter_by", lambda **kwargs: FilterBy())
    monkeypatch.setattr(api.SRS, "filter_by", lambda **kwargs: FilterBy())

    request = SimpleNamespace(
        env=SimpleNamespace(
            render=SimpleNamespace(
                tile_cache_enabled=True,
                options={"check_origin": False},
            )
        ),
        headers={},
        application_url="http://localhost",
        check_origin=lambda origin: True,
        resource_permission=lambda scope, obj: None,
    )

    response = api.tile(
        request,
        resource=[1],
        z=1,
        x=2,
        y=3,
        symbols={},
        p_filter={},
        postprocess={1: '{"contrast": 1.1}'},
        cache=True,
    )

    assert response.content_type == "image/png"
    assert style.tile_cache.get_calls == []
    assert style.tile_cache.put_calls == []
    assert style.render_conds == [{"postprocess": RenderPostprocess(contrast=1.1)}]
