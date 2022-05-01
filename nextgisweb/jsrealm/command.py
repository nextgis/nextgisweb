import json
from collections import OrderedDict
from importlib import import_module
from pathlib import Path
from subprocess import check_call

from ..lib.logging import logger
from ..command import Command
from ..package import amd_packages
from ..pyramid.uacompat import FAMILIES


@Command.registry.register
class JSRealmInstallCommand(object):
    identity = 'jsrealm.install'
    no_initialize = True

    @classmethod
    def argparser_setup(cls, parser, env):
        pass

    @classmethod
    def execute(cls, args, env):
        client_packages = list()
        icon_sources = list()
        cwd = Path().resolve()
        for cid, cobj in env._components.items():
            cmod = import_module(cobj.__class__.__module__)
            cpath = Path(cmod.__file__).parent.resolve()
            jspkg = cpath / 'nodepkg'
            if jspkg.exists():
                for package_json in jspkg.glob('**/package.json'):
                    jspkg_rel = str(package_json.parent.relative_to(cwd))
                    logger.debug("Node package is found in [{}]".format(jspkg_rel))
                    client_packages.append(jspkg_rel)

            icondir = cpath / 'icon'
            if icondir.exists():
                icon_sources.append([cid, str(icondir)])

        package_json = OrderedDict(private=True)
        package_json['config'] = config = OrderedDict()
        config['nextgisweb_core_debug'] = str(env.core.options['debug']).lower()
        config['nextgisweb_jsrealm_root'] = str(Path().resolve())
        config['nextgisweb_jsrealm_packages'] = ','.join(client_packages)
        config['nextgisweb_jsrealm_externals'] = ','.join([
            pname for pname, _ in amd_packages()])
        config['nextgisweb_jsrealm_icon_sources'] = json.dumps(icon_sources)

        ca = env.pyramid.options[f'compression.algorithms']
        config[f'nextgisweb_pyramid_compression_algorithms'] = \
            json.dumps(ca if ca else [])
        
        config['nextgisweb_core_locale_available'] = \
            ','.join(env.core.locale_available)

        targets = dict()
        for k in FAMILIES.keys():
            r = env.pyramid.options[f'uacompat.{k}']
            if type(r) == bool:
                continue
            targets[k] = r
        config['nextgisweb_jsrealm_targets'] = json.dumps(targets)

        package_json['scripts'] = scripts = OrderedDict()
        webpack_config = Path(__file__).parent / 'nodepkg' / 'jsrealm' / 'webpack.root.cjs'
        scripts['build'] = 'webpack --config {}'.format(webpack_config)
        scripts['watch'] = 'webpack --watch --config {}'.format(webpack_config)

        package_json['workspaces'] = client_packages

        with open('package.json', 'w') as fd:
            fd.write(json.dumps(package_json, indent=4))

        check_call(['yarn', 'install'])
