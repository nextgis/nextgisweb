# -*- coding: utf-8 -*-
import sys
import io
from subprocess import check_output, CalledProcessError
from setuptools import setup, find_packages

with io.open('VERSION', 'r') as fd:
    VERSION = fd.read().rstrip()

try:
    gv = check_output(['gdal-config', '--version'], universal_newlines=True).strip()
except CalledProcessError:
    gv = None

requires = [
    # Do not use a specific version of system-like packages because their presence is expected
    'pip',
    'six',

    # Other dependencies
    'alembic==1.4.2',
    'pyramid==1.10.1',
    'SQLAlchemy==1.2.16',
    'transaction==2.4.0',
    'pyramid_tm==2.2.1',
    'pyramid_debugtoolbar==4.5.1',
    'pyramid_mako==1.0.2',
    'zope.sqlalchemy==1.1',
    'zope.interface==4.6.0',
    'zope.event',
    'bunch==1.0.1',
    'flufl.enum==4.1.1',
    'waitress==1.2.0',
    'pygdal' + (('==%s.*' % gv) if gv else ''),  # TODO: Add >=2.3.0
    'psycopg2==2.8.5',
    'geoalchemy2==0.5.0',
    'shapely==1.6.4.post2',
    'affine==2.2.2',
    'geojson==2.4.1',
    'pillow==5.4.1',
    'lxml==4.3.0',
    'passlib==1.7.1',
    'OWSLib==0.17.1',
    'requests[security]==2.22.0',
    'babel==2.6.0',
    'sentry-sdk==0.14.3',
    'python-magic==0.4.15',
    'backports.tempfile==1.0',
    'pyproj==2.2.2',
    'elasticsearch>=7.0.0,<8.0.0',
    'elasticsearch-dsl>=7.1.0,<8.0.0',
    'unicodecsv==0.14.1',
    'flatdict==4.0.1',
    'psutil==5.7.3',
    'zipstream-new==1.1.7',
    'cachetools==3.1.1',

    # TODO: Move to dev or test dependencies
    'freezegun',
    'pytest',
    'pytest-watch',
    'pytest-flake8',
    'webtest',
    'flake8',
    'flake8-future-import',
    'modernize',
]

if sys.version_info[0:2] < (3, 6):
    requires.append('python2-secrets')


extras_require = {
    'dev': ['pdbpp', 'ipython']
}

entry_points = {
    'paste.app_factory': [
        'main = nextgisweb:main'
    ],

    'babel.extractors': [
        'hbs = nextgisweb.i18n.hbs:extract',
    ],

    'pytest11': [
        'nextgisweb = nextgisweb.pytest',
        'nextgisweb.core = nextgisweb.core.test',
        'nextgisweb.pyramid = nextgisweb.pyramid.test',
        'nextgiswev.auth = nextgisweb.auth.test',
        'nextgiswev.resource = nextgisweb.resource.test',
    ],

    'console_scripts': [
        'nextgisweb = nextgisweb.script:main',
        'nextgisweb-config = nextgisweb.script:config',
        'nextgisweb-i18n = nextgisweb.i18n.script:main',
    ],

    'nextgisweb.packages': ['nextgisweb = nextgisweb:pkginfo', ],

    'nextgisweb.amd_packages': [
        'nextgisweb = nextgisweb:amd_packages',
    ],
}

setup(
    name='nextgisweb',
    version=VERSION,
    description='nextgisweb',
    long_description="",
    classifiers=[
        "Programming Language :: Python",
        "Framework :: Pyramid",
        "Topic :: Internet :: WWW/HTTP",
        "Topic :: Internet :: WWW/HTTP :: WSGI :: Application",
        "Framework :: Pytest",
    ],
    author='NextGIS',
    author_email='info@nextgis.com',
    url='http://nextgis.com',
    keywords='web wsgi bfg pylons pyramid',
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    test_suite='nextgisweb',
    python_requires=">=2.7.6, !=3.0.*, !=3.1.*, !=3.2.*, !=3.3.*, !=3.4.*, !=3.5.*, <4",
    install_requires=requires,
    extras_require=extras_require,
    tests_require=['nose', ],
    entry_points=entry_points,
)
