import os

from setuptools import setup, find_packages

requires = [
    'pyramid',
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
    'nose',

    'numpy',
    'gdal',
    'psycopg2',
    'geoalchemy',
    'shapely',
    'geojson',
    'pillow',
    'lxml',
    'passlib',
    'owslib',
]

entry_points = {
    'paste.app_factory': [
        'main = nextgisweb:main'
    ],

    'console_scripts': [
        'nextgisweb = nextgisweb.script:main',
        'nextgisweb-config = nextgisweb.script:config',
    ],

    'nextgisweb.packages': ['nextgisweb = nextgisweb:pkginfo', ],

    'nextgisweb.amd_packages': [
        'nextgisweb = nextgisweb:amd_packages',
    ],
}

setup(name='nextgisweb',
      version='0.0',
      description='nextgisweb',
      long_description="",
      classifiers=[
          "Programming Language :: Python",
          "Framework :: Pyramid",
          "Topic :: Internet :: WWW/HTTP",
          "Topic :: Internet :: WWW/HTTP :: WSGI :: Application",
      ],
      author='',
      author_email='',
      url='',
      keywords='web wsgi bfg pylons pyramid',
      packages=find_packages(),
      include_package_data=True,
      zip_safe=False,
      test_suite='nextgisweb',
      install_requires=requires,
      entry_points=entry_points,
      )

