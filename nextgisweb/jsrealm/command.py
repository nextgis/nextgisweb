# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import json
import logging
from collections import OrderedDict
from importlib import import_module
from subprocess import check_call

from ..compat import Path
from ..command import Command
from ..package import amd_packages

_logger = logging.getLogger(__name__)


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
        cwd = Path().resolve()
        for cid, cobj in env._components.items():
            cmod = import_module(cobj.__class__.__module__)
            cpath = Path(cmod.__file__).parent.resolve()
            jspkg = cpath / 'nodepkg'
            if jspkg.exists():
                for package_json in jspkg.glob('**/package.json'):
                    jspkg_rel = str(package_json.parent.relative_to(cwd))
                    _logger.debug("Node package is found in [{}]".format(jspkg_rel))
                    client_packages.append(str(jspkg_rel))

        package_json = OrderedDict(private=True)
        package_json['config'] = config = OrderedDict()
        config['nextgisweb_core_debug'] = str(env.core.options['debug']).lower()
        config['nextgisweb_jsrealm_root'] = str(Path().resolve())
        config['nextgisweb_jsrealm_packages'] = ','.join(client_packages)
        config['nextgisweb_jsrealm_externals'] = ','.join([
            pname for pname, _ in amd_packages()])

        package_json['scripts'] = scripts = OrderedDict()
        webpack_config = Path(__file__).parent / 'nodepkg' / 'jsrealm' / 'webpack.root.cjs'
        scripts['build'] = 'webpack --config {}'.format(webpack_config)
        scripts['watch'] = 'webpack --watch --config {}'.format(webpack_config)

        package_json['workspaces'] = client_packages

        with open('package.json', 'w') as fd:
            fd.write(json.dumps(package_json, indent=4))

        check_call(['yarn', 'install'])
