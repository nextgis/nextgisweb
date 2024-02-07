import pytest
import transaction

from nextgisweb.env import DBSession, inject

from nextgisweb.file_storage import FileObj

from .. import SVGMarker, SVGMarkerLibrary, SVGMarkerLibraryComponent

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults")


@pytest.fixture(scope="module", autouse=True)
def options(ngw_data_path, ngw_env):
    paths = [str(ngw_data_path / "folder1"), str(ngw_data_path / "folder2")]
    with ngw_env.svg_marker_library.options.override({"path": paths}):
        yield


@pytest.fixture(scope="module")
def lib():
    with transaction.manager:
        res = SVGMarkerLibrary(
            files=[
                SVGMarker(
                    name=f"marker{idx}",
                    fileobj=FileObj().from_content(b""),
                )
                for idx in (1, 2)
            ]
        ).persist()
    return res


@inject()
def test_lookup(lib, ngw_data_path, *, comp: SVGMarkerLibraryComponent):
    def asert_lookup(marker, expected):
        resolved = comp.lookup(marker, library=lib)
        assert resolved == str(expected)

    marker1 = lib.find_svg_marker("marker1")
    marker2 = lib.find_svg_marker("marker2")

    asert_lookup("marker1", marker1.fileobj.filename())
    asert_lookup("marker2", marker2.fileobj.filename())
    asert_lookup("marker3", ngw_data_path / "folder1/marker3.svg")

    comp.cache.clear()
    with transaction.manager:
        DBSession.delete(marker1)

    asert_lookup("marker1", ngw_data_path / "folder1/marker1.svg")
    asert_lookup("marker2", marker2.fileobj.filename())

    comp.cache.clear()
    with comp.options.override({"path": [str(ngw_data_path / "folder1")]}):
        asert_lookup("marker1", ngw_data_path / "folder1/marker1.svg")
