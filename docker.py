import ngwdocker
ngwdocker.require_version('>=2.0.0.dev14')

from pathlib import Path

from ngwdocker import PackageBase
from ngwdocker.base import AppImage
from ngwdocker.util import copyfiles


class Package(PackageBase):

    # TODO: Remove legacy method
    def debpackages(self):
        return (
            'libgdal-dev',
            'libgeos-dev',
            'gdal-bin',
            'g++',
            'libxml2-dev',
            'libxslt1-dev',
            'zlib1g-dev',
            'libjpeg-turbo8-dev',
            'nodejs',
            'postgresql-client',
            'libmagic-dev',
        )


@AppImage.on_user_dir.handler
def on_user_dir(event):
    nextgisweb_package = event.image.context.packages['nextgisweb']

    font = nextgisweb_package.settings.get('font')
    if font is not None:
        fontpath = Path(font)
        copyfiles([fontpath], event.source / 'build' / 'font', fontpath)