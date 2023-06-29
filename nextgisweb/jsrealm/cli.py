from itertools import chain
import json
from pathlib import Path
from subprocess import check_call

from nextgisweb.env import Env
from nextgisweb.env.cli import EnvCommand, cli
from nextgisweb.env.package import amd_packages, pkginfo
from nextgisweb.lib.logging import logger

from nextgisweb.core import CoreComponent
from nextgisweb.pyramid import PyramidComponent
from nextgisweb.pyramid.uacompat import FAMILIES

from .util import scan_for_icons, scan_for_nodepkgs


@cli.group()
class jsrealm:
    pass


@jsrealm.command()
def install(
    self: EnvCommand.customize(env_initialize=False),
    *, env: Env, core: CoreComponent, pyramid: PyramidComponent,
):
    npkg_scan = list()
    icon_scan = list()

    debug = core.options['debug']
    cwd = Path().resolve()

    for cid, cpath in pkginfo._comp_path.items():
        cpath = cpath.resolve().relative_to(cwd)
        if cid not in env.components and debug:
            logger.debug("Component [%s] excluded from build in debug mode", cid)
            continue

        npkg_scan.append(scan_for_nodepkgs(cid, cpath))
        icon_scan.append(scan_for_icons(cid, cpath))

    npkgs = [str(p) for p in chain(*npkg_scan)]
    icons = [str(p) for p in chain(*icon_scan)]

    package_json = dict(private=True)
    package_json['config'] = config = dict()
    config['nextgisweb_core_debug'] = str(debug).lower()
    config['nextgisweb_jsrealm_root'] = str(cwd.resolve())
    config['nextgisweb_jsrealm_packages'] = ','.join(npkgs)
    config['nextgisweb_jsrealm_externals'] = ','.join([pn for pn, _ in amd_packages()])
    config['nextgisweb_jsrealm_icon_sources'] = json.dumps(icons)

    ca = pyramid.options['compression.algorithms']
    config['nextgisweb_pyramid_compression_algorithms'] = \
        json.dumps(ca if ca else [])

    config['nextgisweb_core_locale_available'] = \
        ','.join(core.locale_available)

    targets = dict()
    for k in FAMILIES.keys():
        r = pyramid.options[f'uacompat.{k}']
        if type(r) == bool:
            continue
        targets[k] = r
    config['nextgisweb_jsrealm_targets'] = json.dumps(targets)

    webpack_config = (
        Path(__file__).parent / 'nodepkg' / 'jsrealm' / 'webpack.root.cjs'
    ).resolve().relative_to(cwd)

    package_json['scripts'] = scripts = dict()
    scripts['build'] = 'webpack --progress --config {}'.format(webpack_config)
    scripts['watch'] = 'webpack --progress --watch --config {}'.format(webpack_config)

    package_json['workspaces'] = npkgs

    with open('package.json', 'w') as fd:
        fd.write(json.dumps(package_json, indent=4))

    check_call(['yarn', 'install'])
