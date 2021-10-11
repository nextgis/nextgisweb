from ..pyramid import viewargs


@viewargs(renderer='nextgisweb:file_upload/template/test.mako')
def test(request):
    return dict(title="Страница тестирования загрузки файлов")


def setup_pyramid(comp, config):
    config.add_route(
        'file_upload.test',
        '/test/file_upload'
    ).add_view(test)
