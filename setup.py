import io
from packaging.version import Version
from setuptools import find_packages, setup
from subprocess import CalledProcessError, check_output

with io.open("VERSION", "r") as fd:
    VERSION = fd.read().rstrip()

requires = [
    "affine==2.4.0",
    "babel==2.17.0",
    'backports-datetime-fromisoformat; python_version<"3.11"',
    "cachetools==6.1.0",
    "cryptography==45.0.5",
    "defusedxml==0.7.1",
    "docstring-parser==0.16",
    "geoalchemy2==0.17.1",
    "httpx[http2]==0.28.1",
    "humanize==4.12.3",
    "lxml>5.0,<6.1",
    "nh3==0.2.22",
    "msgspec==0.19.0",
    "numpy<2",
    "networkx",
    "orjson==3.11.0",
    "passlib==1.7.4",
    "pillow==11.3.0",
    "pillow-heif==1.0.0",
    "poeditor",
    "psutil==7.0.0",
    "psycopg2==2.9.10",
    "pyproj==3.7.1",
    "pyramid==2.0.2",
    "pyramid-mako==1.1.0",
    "pyramid-tm==2.6",
    "python-magic==0.4.27",
    "python-ulid==3.0.0",
    "requests==2.32.4",
    "sentry-sdk==1.45.0",
    "shapely==2.1.1",
    "SQLAlchemy==1.4.54",
    "transaction==5.0",
    "typing-extensions",
    "ua-parser[re2]==1.0.*",
    "urllib3<2",
    "waitress==2.1.2",
    "zipstream-new==1.1.8",
    "zope.sqlalchemy==3.1",
    "zope.interface==7.2",
    "zope.event==5.1",
]

try:
    gv = check_output(["gdal-config", "--version"], universal_newlines=True).strip()
    gdal_pkg = f"pygdal=={gv}.*" if Version(gv) < Version("3.7") else f"gdal=={gv}.*"
except CalledProcessError:
    gdal_pkg = "pygdal>=3.4"
requires.append(gdal_pkg)

extras_require = dict(
    development=[
        "black<24",
        "bump2version",
        "coverage",
        "flake8-future-import",
        "flake8",
        "freezegun",
        "mapbox-vector-tile",
        "pre-commit",
        "pyramid-debugtoolbar==4.10",
        "pytest-flake8",
        "pytest-watch",
        "pytest==7.3.*",
        "ruff>=0.9.0",
        "sqlglot==26.30.0",
        "webtest",
    ]
)

entry_points = {
    "paste.app_factory": ["main = nextgisweb:main"],
    "pytest11": [
        "nextgisweb.env = nextgisweb.env.test",
        "nextgisweb.auth = nextgisweb.auth.test",
        "nextgisweb.core = nextgisweb.core.test",
        "nextgisweb.file_upload = nextgisweb.file_upload.test",
        "nextgisweb.pyramid = nextgisweb.pyramid.test",
        "nextgisweb.resource = nextgisweb.resource.test",
    ],
    "nextgisweb.packages": [
        "nextgisweb = nextgisweb:pkginfo",
    ],
    "console_scripts": [
        "nextgisweb = nextgisweb.script:main",
        "nextgisweb-config = nextgisweb.script:config",
        "nextgisweb-i18n = nextgisweb.i18n.script:main",
    ],
}


setup(
    name="nextgisweb",
    version=VERSION,
    description="NextGIS Web main package",
    author="NextGIS",
    author_email="info@nextgis.com",
    url="https://nextgis.com/nextgis-web",
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    python_requires=">=3.10",
    install_requires=requires,
    extras_require=extras_require,
    entry_points=entry_points,
)
