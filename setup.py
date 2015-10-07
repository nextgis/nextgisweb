from subprocess import check_output, CalledProcessError
from setuptools import setup, find_packages

try:
    gv = check_output(['gdal-config', '--version']).strip()
except CalledProcessError:
    gv = None

requires = [
    'pyramid>=1.5',
    'SQLAlchemy>=0.8,<0.9',
    'transaction',
    'pyramid_tm',
    'pyramid_debugtoolbar',
    'pyramid_mako',
    'zope.sqlalchemy',
    'zope.interface',
    'bunch',
    'flufl.enum',
    'waitress',
    'pygdal' + (('>=' + gv + '.0,<=' + gv + '.9999') if gv else ''),
    'psycopg2',
    'geoalchemy>=0.7.2',
    'shapely',
    'geojson',
    'pillow',
    'lxml',
    'passlib',
    'owslib>=0.9.2',
    'requests',
    'babel',
]

entry_points = {
    'paste.app_factory': [
        'main = nextgisweb:main'
    ],

    'babel.extractors': [
        'hbs = nextgisweb.i18n.hbs:extract',
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
    version='0.0',
    description='nextgisweb',
    long_description="",
    classifiers=[
        "Programming Language :: Python",
        "Framework :: Pyramid",
        "Topic :: Internet :: WWW/HTTP",
        "Topic :: Internet :: WWW/HTTP :: WSGI :: Application",
    ],
    author='NextGIS',
    author_email='info@nextgis.ru',
    url='http://nextgis.ru/nextgis-web/',
    keywords='web wsgi bfg pylons pyramid',
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    test_suite='nextgisweb',
    install_requires=requires,
    tests_require=['nose', ],
    entry_points=entry_points,
)
