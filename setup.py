import os

from setuptools import setup, find_packages

here = os.path.abspath(os.path.dirname(__file__))
README = open(os.path.join(here, 'README.txt')).read()
CHANGES = open(os.path.join(here, 'CHANGES.txt')).read()

requires = [
    'pyramid',
    'SQLAlchemy',
    'transaction',
    'pyramid_tm',
    'pyramid_debugtoolbar',
    'zope.sqlalchemy',
    'waitress',

    'gdal',
    'psycopg2',
    'geoalchemy',
    'PIL',
    'wtforms',
    
    ]

components = (
    'core',
    'pyramidcomp',
    'auth',
    'security',
    'layer_group',
    'layer',
    'style',
    'webmap',
    'layer_group.root',
    'vector_layer',
    'raster_layer',
    'file_upload',
)

entry_points = {
    'paste.app_factory': [
        'main = nextgisweb:main'
    ],
    'console_scripts': [
        'nextgisweb = nextgisweb.script:main',
    ],
    'nextgisweb.component': ['%s = nextgisweb.%s' % (i, i) for i in components],

    'nextgisweb.amd_packages': [
        'nextgisweb = nextgisweb:amd_packages',
    ],
}

setup(name='nextgisweb',
      version='0.0',
      description='nextgisweb',
      long_description=README + '\n\n' +  CHANGES,
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

