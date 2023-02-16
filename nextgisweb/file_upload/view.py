from ..gui import REACT_RENDERER
from .util import _


def test(request):
    return dict(
        title=_("File Upload testing page"),
        entrypoint="@nextgisweb/file-upload/test",
    )


def setup_pyramid(comp, config):
    config.add_route(
        'file_upload.test',
        '/test/file_upload'
    ).add_view(test, renderer=REACT_RENDERER)
