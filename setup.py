import os

from setuptools import setup, find_packages

requires = [
    'pyramid',
    'SQLAlchemy',
    'transaction',
    'pyramid_tm',
    'pyramid_debugtoolbar',
    'zope.sqlalchemy',
    'zope.interface',
    'waitress',

    'numpy',
    'gdal',
    'psycopg2',
    'geoalchemy',
    'shapely',
    'geojson',
    'PIL',
    'wtforms',
    'lxml',
    
    ]

components = (
    'core',
    'pyramidcomp',
    'auth',
    'security',
    'spatial_ref_sys',
    'layer_group',
    'layer',
    'feature_layer',
    'feature_description',
    'feature_photo',
    'style',
    'webmap',
    'layer_group.root',
    'file_storage',
    'vector_layer',
    'raster_layer',
    'raster_style',
    'file_upload',
)

entry_points = {
    'paste.app_factory': [
        'main = nextgisweb:main'
    ],
    'console_scripts': [
        'nextgisweb = nextgisweb.script:main',
        'nextgisweb-config = nextgisweb.script:config',
    ],
    'nextgisweb.component': ['%s = nextgisweb.%s' % (i, i) for i in components],

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

