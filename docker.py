import ngwdocker

ngwdocker.require_version(">=2.2.0.dev0")

from pathlib import Path

from ngwdocker import PackageBase
from ngwdocker.base import AppImage
from ngwdocker.util import copyfiles


class Package(PackageBase):
    pass


@AppImage.on_apt.handler
def on_apt(event):
    event.package(
        # uWSGI internal routing support
        "libpcre3",
        "libpcre3-dev",
        # For msgfmt and development
        "gettext",
    )

    if event.image.context.is_development():
        event.image.environment["SQLALCHEMY_WARN_20"] = "1"
    else:
        event.image.environment["SQLALCHEMY_SILENCE_UBER_WARNING"] = "1"

    # Chromium and ghostscript for printing
    event.add_repository("ppa:savoury1/ffmpeg4")
    event.add_repository("ppa:savoury1/chromium")
    event.package("chromium-browser", "ghostscript")


@AppImage.on_user_dir.handler
def on_user_dir(event):
    nextgisweb_package = event.image.context.packages["nextgisweb"]

    font = nextgisweb_package.settings.get("font")
    if font is not None:
        fontpath = Path(font)
        copyfiles([fontpath], event.source / "build" / "font", fontpath)


@AppImage.on_virtualenv.handler
def on_virtualenv(event):
    pip_install = f"{event.path}/bin/pip install --no-cache-dir"
    event.before_install(
        f"{pip_install} setuptools packaging",
        f"gdal_numpy_spec=$(cd package/nextgisweb; {event.path}/bin/python setup.py gdal_numpy_spec)",
        f"{pip_install} \"$(echo $gdal_numpy_spec | cut -d ' ' -f 2)\"",
        f"{pip_install} --no-build-isolation \"$(echo $gdal_numpy_spec | cut -d ' ' -f 1)\"",
    )

    event.after_install(
        "ln -s package/nextgisweb/.prettierrc.cjs $NGWROOT/",
        "ln -s package/nextgisweb/eslint.config.cjs $NGWROOT/",
    )
