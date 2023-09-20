from pathlib import Path

from ..component import Component


def test_attributes():
    assert Component.package == "nextgisweb"
    assert Component.module == "nextgisweb.env"
    assert Component.root_path == Path(__file__).parent.parent
    assert Component.resource_path("test/__init__.py").is_file()
