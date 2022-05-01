import sys
import io
import os
import os.path
from stat import S_IXUSR, S_IXGRP, S_IXOTH
from subprocess import check_output, CalledProcessError
from setuptools import setup, find_packages
from setuptools.command.develop import develop
from setuptools.command.install import install


with io.open('VERSION', 'r') as fd:
    VERSION = fd.read().rstrip()

try:
    gv = check_output(['gdal-config', '--version'], universal_newlines=True).strip()
except CalledProcessError:
    gv = None

requires = [
    'affine==2.3.0',
    'alembic==1.7.5',
    'babel==2.9.1',
    'bunch==1.0.1',
    'cachetools==4.2.4',
    'elasticsearch>=7.0.0,<8.0.0',
    'elasticsearch-dsl>=7.1.0,<8.0.0',
    'flatdict==4.0.1',
    'geoalchemy2==0.10.2',
    'humanize==3.13.1',
    'lxml==4.6.4',
    'numpy',
    'networkx',
    'orjson==3.6.7',
    'OWSLib==0.25.0',
    'passlib==1.7.4',
    'pillow==8.4.0',
    'poeditor',
    'psutil==5.8.0',
    'psycopg2==2.9.2',
    'pygdal' + (('==%s.*' % gv) if gv else ''),  # TODO: Add >=2.3.0
    'pyproj==3.3.0',
    'pyramid==2.0',
    'pyramid_debugtoolbar==4.9',
    'pyramid_mako==1.1.0',
    'pyramid_tm==2.4',
    'python-magic==0.4.24',
    'requests[security]==2.26.0',
    'sentry-sdk==1.3.0',
    'shapely==1.8.0',
    'SQLAlchemy==1.4.29',
    'transaction==3.0.1',
    'ua-parser==0.10.0',
    'waitress==2.0.0',
    'zipstream-new==1.1.8',
    'zope.sqlalchemy==1.6',
    'zope.interface==5.4.0',
    'zope.event==4.5.0',

    # TODO: Move to dev or test dependencies
    'coverage',
    'flake8-coding',
    'flake8-future-import',
    'flake8',
    'freezegun',
    'pytest-flake8',
    'pytest-watch',
    'pytest==7.0.*',
    'webtest',
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

    'pytest11': [
        'nextgisweb = nextgisweb.pytest',
        'nextgisweb.core = nextgisweb.core.test',
        'nextgisweb.pyramid = nextgisweb.pyramid.test',
        'nextgiswev.auth = nextgisweb.auth.test',
        'nextgiswev.resource = nextgisweb.resource.test',
    ],

    'nextgisweb.packages': ['nextgisweb = nextgisweb:pkginfo', ],

    'nextgisweb.amd_packages': [
        'nextgisweb = nextgisweb:amd_packages',
    ],
}


class DevelopCommand(develop):
    def run(self):
        develop.run(self)

        # Builtin console_scripts entrypoint scripts are very slow because of
        # checking package requirement. So we use generated wrapper scripts.

        bin_dir, _ = os.path.split(sys.executable)
        for name, module, func in (
            ('nextgisweb', 'nextgisweb.script', 'main'),
            ('nextgisweb-config', 'nextgisweb.script', 'config'),
            ('nextgisweb-i18n', 'nextgisweb.i18n.script', 'main'),
        ):
            sf = os.path.join(bin_dir, name)
            with open(sf, 'w') as fd:
                fd.write("#!{}\n".format(sys.executable))
                fd.write("from {} import {} as main\n".format(module, func))
                fd.write("if __name__ == '__main__': main()\n")

            st = os.stat(sf)
            os.chmod(sf, st.st_mode | S_IXUSR | S_IXGRP | S_IXOTH)


class InstallCommand(install):
    def run(self):
        raise RuntimeError(
            "Only development mode installation "
            "(pip install -e ...) is supported!")
        install.run(self)


setup(
    name='nextgisweb',
    version=VERSION,
    description='NextGIS Web main package',
    author='NextGIS',
    author_email='info@nextgis.com',
    url='https://nextgis.com/nextgis-web',
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    python_requires=">=3.8.*, <4",
    install_requires=requires,
    extras_require=extras_require,
    entry_points=entry_points,
    cmdclass=dict(
        develop=DevelopCommand,
        install=InstallCommand,
    )
)
