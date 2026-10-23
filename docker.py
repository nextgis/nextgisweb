# // crater >= 2.3.0.dev1

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
        "libpcre2-8-0",
        "libpcre2-dev",
        # For msgfmt and development
        "gettext",
    )

    # Chrome for PDF generation

    event.package(
        "ghostscript",
        "libasound2t64",
        "libatk-bridge2.0-0",
        "libatk1.0-0",
        "libxcomposite1",
        "libxdamage1",
        "libxfixes3",
        "libxrandr2",
        "unzip",
    )

    event.cleanup(
        "( : ",
        "    cd $(mktemp -d)",
        "    export NPM_CONFIG_UPDATE_NOTIFIER=false",
        "    export PUPPETEER_CACHE_DIR=$(pwd)",
        "    path=$(npx --yes @puppeteer/browsers install --format '{{path}}' chrome-headless-shell@stable)",
        "    cp -a $(dirname $path) /opt/chrome",
        "    ln -s /opt/chrome/chrome-headless-shell /usr/local/bin/chrome",
        "    rm -rf $(pwd)",
        ")",
    )

    # Enable pnpm, which will be downloaded later
    event.cleanup("corepack enable pnpm")


@AppImage.on_user_dir.handler
def on_user_dir(event):
    nextgisweb_package = event.image.context.packages["nextgisweb"]

    font = nextgisweb_package.settings.get("font")
    if font is not None:
        fontpath = Path(font)
        copyfiles([fontpath], event.source / "build" / "font", fontpath)


@AppImage.on_package_files.handler
def on_package_files(event):
    if event.package.name != "nextgisweb":
        return

    crate = event.package.path / "crates" / "ngw-mvt"
    event.files.extend(
        f
        for f in crate.rglob("*")
        if f.is_file() and "target" not in f.parts
    )


@AppImage.on_virtualenv.handler
def on_virtualenv(event):
    pip_install = f"{event.path}/bin/pip install --no-cache-dir"
    event.before_install(
        f"{pip_install} setuptools packaging",
        f"gdal_numpy_spec=$(cd package/nextgisweb; {event.path}/bin/python setup.py gdal_numpy_spec)",
        f"{pip_install} \"$(echo $gdal_numpy_spec | cut -d ' ' -f 2)\"",
        f"{pip_install} --no-build-isolation \"$(echo $gdal_numpy_spec | cut -d ' ' -f 1)\"",
    )

    # Build native MVT encoder from source with a temporary Rust toolchain,
    # which is removed in the same layer. The toolchain version is pinned by
    # rust-toolchain.toml. TODO: Install a prebuilt wheel when published.
    event.before_install(
        "export RUSTUP_HOME=/tmp/rustup CARGO_HOME=/tmp/cargo PATH=/tmp/cargo/bin:$PATH",
        "curl -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain none",
    )
    event.requirement("$CRATER_ROOT/package/nextgisweb/crates/ngw-mvt")

    event.after_install(
        "rm -rf /tmp/rustup /tmp/cargo",
        "ln -s package/nextgisweb/.prettierrc.cjs $CRATER_ROOT/",
        "ln -s package/nextgisweb/eslint.config.ts $CRATER_ROOT/",
    )
