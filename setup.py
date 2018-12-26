from subprocess import check_output, CalledProcessError
from setuptools import setup, find_packages

try:
    gv = check_output(['gdal-config', '--version']).strip()
except CalledProcessError:
    gv = None

requires = [
    'pyramid==1.10.1',
    'SQLAlchemy==1.2.14',
    'transaction==2.4.0',
    'pyramid_tm==2.2.1',
    'pyramid_debugtoolbar==4.5',
    'pyramid_mako==1.0.2',
    'zope.sqlalchemy==1.0',
    'zope.interface==4.6.0',
    'bunch==1.0.1',
    'flufl.enum==4.1.1',
    'waitress==1.1.0',
    'pygdal' + (('>=' + gv + '.0,<=' + gv + '.9999') if gv else ''),
    'psycopg2==2.7.6.1',
    'geoalchemy2==0.5.0',
    'shapely==1.6.4.post2',
    'geojson==2.4.1',
    'unicodecsv==0.14.1',
    'pillow==5.3.0',
    'lxml==4.2.5',
    'passlib==1.7.1',
    'OWSLib>=0.17.0',
    'requests==2.20.1',
    'babel==2.6.0',
    'minio==4.0.6',
]

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
    version='3.1',
    description='nextgisweb',
    long_description="",
    classifiers=[
        "Programming Language :: Python",
        "Framework :: Pyramid",
        "Topic :: Internet :: WWW/HTTP",
        "Topic :: Internet :: WWW/HTTP :: WSGI :: Application",
    ],
    author='NextGIS',
    author_email='info@nextgis.com',
    url='http://nextgis.com',
    keywords='web wsgi bfg pylons pyramid',
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    test_suite='nextgisweb',
    install_requires=requires,
    extras_require=extras_require,
    tests_require=['nose', ],
    entry_points=entry_points,
)
