import json
from itertools import chain
from pathlib import Path
from subprocess import check_call
from typing import List

from nextgisweb.env import Env
from nextgisweb.env.cli import EnvCommand, comp_cli
from nextgisweb.env.package import pkginfo
from nextgisweb.lib.logging import logger

from nextgisweb.core import CoreComponent
from nextgisweb.pyramid import PyramidComponent
from nextgisweb.pyramid.uacompat import FAMILIES

from .util import scan_for_icons, scan_for_nodepkgs


def create_tsconfig(npkgs: List[str]):

    compiler_options = dict(
        target="es5",
        lib=["dom", "dom.iterable", "esnext"],
        allowJs=True,
        skipLibCheck=True,
        esModuleInterop=True,
        strict=False,
        moduleResolution= "node",
        resolveJsonModule= True,
        isolatedModules=True,
        noEmit=True,
        allowSyntheticDefaultImports=True,
        forceConsistentCasingInFileNames= True,
        noFallthroughCasesInSwitch= True,
        module="esnext",
        jsx= "react-jsx",
        baseUrl= ".",
        paths= {
            "react": ["./node_modules/@types/react"]
        }
    )
    tsconfig_json = dict(
        compilerOptions=compiler_options,
        include = ['{}/**/*'.format(pkg) for pkg in npkgs]
    )

    with open('tsconfig.json', 'w') as fd:
        fd.write(json.dumps(tsconfig_json, indent=4))


@comp_cli.command()
def install(
    self: EnvCommand.customize(env_initialize=False),
    *, env: Env, core: CoreComponent, pyramid: PyramidComponent,
):
    debug = core.options['debug']
    cwd = Path().resolve()

    cpaths = dict()
    for cid, cpath in pkginfo._comp_path.items():
        cpath = cpath.resolve().relative_to(cwd)
        if cid not in env.components and debug:
            logger.debug("Component [%s] excluded from build in debug mode", cid)
            continue
        cpaths[cid] = cpath

    npkgs = [str(p) for p in chain(*[
        scan_for_nodepkgs(cid, cpath)
        for cid, cpath in cpaths.items()
    ])]

    icons = {cid: str(ipath) for cid, ipath in filter(
        lambda i: i[1] is not None,
        [
            (cid, scan_for_icons(cid, cpath))
            for cid, cpath in cpaths.items()
        ]
    )}

    package_json = dict(private=True)
    package_json['config'] = config = dict()
    config['nextgisweb_core_debug'] = str(debug).lower()
    config['nextgisweb_jsrealm_root'] = str(cwd.resolve())
    config['nextgisweb_jsrealm_packages'] = ','.join(npkgs)
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

    create_tsconfig(npkgs)

    check_call(['yarn', 'install'])
