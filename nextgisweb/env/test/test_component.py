from nextgisweb.core import CoreComponent


def test_attributes():
    assert CoreComponent.package == "nextgisweb"
    assert CoreComponent.module == "nextgisweb.core"
    assert CoreComponent.identity == "core"
    assert CoreComponent.basename == "Core"

    assert str(CoreComponent.root_path).endswith("nextgisweb/nextgisweb/core")
    assert CoreComponent.resource_path("test/__init__.py").is_file()
