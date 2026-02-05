import io
import sys
from packaging.version import Version
from setuptools import find_packages, setup
from subprocess import CalledProcessError, check_output

with io.open("VERSION", "r") as fd:
    VERSION = fd.read().rstrip()

try:
    gv = check_output(["gdal-config", "--version"], universal_newlines=True).strip()
    gdal_spec = f"pygdal=={gv}.*" if Version(gv) < Version("3.7") else f"gdal=={gv}.*"
except CalledProcessError:
    gdal_spec = "pygdal>=3.4"


# Provide the required GDAL and Numpy versions for docker.py as a single source
# of truth, ensuring compatibility with GDAL installation, where Numpy must be
# pre-installed.

numpy_spec = "numpy<2"
if __name__ == "__main__" and len(sys.argv) >= 2 and sys.argv[1] == "gdal_numpy_spec":
    print(f"{gdal_spec} {numpy_spec}")
    sys.exit(0)


requires = [
    gdal_spec,
    numpy_spec,
    "affine==2.4.0",
    "babel==2.17.0",
    'backports-datetime-fromisoformat; python_version<"3.11"',
    "cachetools==6.1.0",
    "defusedxml==0.7.1",
    "docstring-parser==0.16",
    "geoalchemy2==0.17.1",
    "httpx[http2]==0.28.1",
    "humanize==4.12.3",
    "lxml>5.0,<6.1",
    "nh3==0.2.22",
    "mako==1.3.10",
    "msgspec==0.20.0",
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
    "pyramid-tm==2.6",
    "python-magic==0.4.27",
    "python-ulid==3.0.0",
    "requests==2.32.4",
    "sentry-sdk>2,<3",
    "shapely==2.1.1",
    "SQLAlchemy==2.0.44",
    "transaction==5.0",
    "typing-extensions",
    "ua-parser[re2]==1.0.*",
    "urllib3<2",
    "waitress==2.1.2",
    "zipstream-new==1.1.8",
    "zope.sqlalchemy==4.1",
    "zope.interface==7.2",
    "zope.event==5.1",
]

extras_require = dict(
    development=[
        "bump2version",
        "coverage",
        "freezegun",
        "json5",
        "mapbox-vector-tile",
        "pre-commit",
        "pytest-cov",
        "pytest==9.0.*",
        "ruff>=0.12.12",
        "sqlglot==26.30.0",
        "ty",
        "webtest",
    ]
)

entry_points = {
    "paste.app_factory": ["main = nextgisweb:main"],
    "pytest11": ["nextgisweb.pytest = nextgisweb.pytest"],
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
