import ngwdocker
ngwdocker.require_version('>=2.0.0.dev16')

from pathlib import Path

from ngwdocker import PackageBase
from ngwdocker.base import AppImage
from ngwdocker.util import copyfiles


class Package(PackageBase):
    pass


@AppImage.on_user_dir.handler
def on_user_dir(event):
    nextgisweb_package = event.image.context.packages['nextgisweb']

    font = nextgisweb_package.settings.get('font')
    if font is not None:
        fontpath = Path(font)
        copyfiles([fontpath], event.source / 'build' / 'font', fontpath)
