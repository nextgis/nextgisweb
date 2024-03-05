import json
import os
import shutil
from itertools import chain
from pathlib import Path
from subprocess import check_call
from typing import List

from nextgisweb.env import Env
from nextgisweb.env.cli import UninitializedEnvCommand, comp_cli, opt
from nextgisweb.env.package import pkginfo
from nextgisweb.lib.logging import logger

from nextgisweb.core import CoreComponent
from nextgisweb.pyramid import PyramidComponent
from nextgisweb.pyramid.uacompat import FAMILIES

from .component import JSRealmComponent
from .util import scan_for_nodepkgs


def create_tsconfig(npkgs: List[str], *, debug):
    compiler_options = dict(
        target="es2015",
        lib=["dom", "dom.iterable", "esnext"],
        allowJs=True,
        skipLibCheck=True,
        esModuleInterop=True,
        strict=debug,
        moduleResolution="node",
        resolveJsonModule=True,
        isolatedModules=True,
        noEmit=True,
        allowSyntheticDefaultImports=True,
        forceConsistentCasingInFileNames=True,
        noFallthroughCasesInSwitch=True,
        module="esnext",
        jsx="react-jsx",
        baseUrl=".",
        paths={"react": ["./node_modules/@types/react"]},
    )

    include = []

    for pkg in npkgs:
        include.append("{}/**/*.ts".format(pkg))
        include.append("{}/**/*.tsx".format(pkg))

    tsconfig_json = dict(
        compilerOptions=compiler_options,
        include=include,
        exclude=["node_modules"],
    )

    with open("tsconfig.json", "w") as fd:
        fd.write(json.dumps(tsconfig_json, indent=4))


@comp_cli.command()
def install(
    self: UninitializedEnvCommand,
    watch: bool = opt(False),
    build: bool = opt(False),
    *,
    env: Env,
    core: CoreComponent,
    pyramid: PyramidComponent,
    jsrealm: JSRealmComponent,
):
    """Setup JavaScript environment

    :param watch: Start `yarn run watch` after installation
    :param build: Start `yarn run build` after installation"""

    from babel.messages.plurals import PLURALS

    if watch and build:
        raise RuntimeError("Flags --watch and --build are mutually exclusive.")

    debug = core.options["debug"]
    cwd = Path().resolve()

    cpaths = dict()
    for cid, cpath in pkginfo._comp_path.items():
        cpath = cpath.resolve().relative_to(cwd)
        if cid not in env.components and debug:
            logger.debug("Component [%s] excluded from build in debug mode", cid)
            continue
        cpaths[cid] = cpath

    npkgs = [
        str(p) for p in chain(*[scan_for_nodepkgs(cid, cpath) for cid, cpath in cpaths.items()])
    ]

    package_json = dict(private=True)
    package_json["engines"] = dict(node=">=20.0.0")
    package_json["nextgisweb"] = nextgisweb = dict()

    s_env = nextgisweb["env"] = dict()
    s_env["packages"] = {
        name: str(pkg._path.relative_to(cwd)) for name, pkg in pkginfo.packages.items()
    }
    s_env["components"] = {
        comp_id: str(pkginfo.comp_path(comp_id).relative_to(cwd)) for comp_id in pkginfo.components
    }

    def language(lang):
        nplurals, plural = PLURALS.get(lang, PLURALS.get(lang.split("-")[0]))
        return dict(code=lang, nplurals=nplurals, plural=plural)

    nextgisweb["i18n"] = {
        "languages": [language(lang) for lang in core.locale_available],
        "external": core.options["locale.external_path"],
    }

    s_core = nextgisweb["core"] = dict()
    s_core["debug"] = debug

    o_pyramid = pyramid.options
    c_pyramid = nextgisweb["pyramid"] = dict()
    c_pyramid["compression"] = {algo: True for algo in o_pyramid["compression.algorithms"]}

    s_jsrealm = nextgisweb["jsrealm"] = dict()
    s_jsrealm["tscheck"] = jsrealm.options.get("tscheck", debug)
    s_jsrealm["eslint"] = jsrealm.options.get("eslint", debug)

    stylesheets = s_jsrealm["stylesheets"] = list()
    for comp in env.chain("stylesheets"):
        stylesheets.extend(str(s) for s in comp.stylesheets())

    targets = s_jsrealm["targets"] = dict()
    for k in FAMILIES.keys():
        r = o_pyramid[f"uacompat.{k}"]
        if isinstance(r, bool):
            continue
        targets[k] = r

    jsrealm_path = Path(__file__).parent / "nodepkg" / "jsrealm"
    webpack_root = (jsrealm_path / "webpack.root.cjs").resolve().relative_to(cwd)

    package_json["scripts"] = scripts = dict()
    scripts["build"] = "webpack --progress --config {}".format(webpack_root)
    scripts["watch"] = "webpack --progress --watch --config {}".format(webpack_root)

    package_json["workspaces"] = npkgs

    with open("package.json", "w") as fd:
        fd.write(json.dumps(package_json, indent=4))

    create_tsconfig(npkgs, debug=debug)

    for comp in env.chain("client_codegen"):
        comp.client_codegen()

    ngw_root = pkginfo.packages["nextgisweb"]._path.parent
    pkg_root = ngw_root.parent
    if len(list(pkg_root.glob("nextgisweb_*"))) > 0:
        linters_configs = [".eslintrc.cjs", ".prettierrc.cjs", ".editorconfig"]
        for lc in linters_configs:
            tf = pkg_root / lc
            if tf.exists():
                continue
            tf.symlink_to((ngw_root / lc).relative_to(pkg_root))

    check_call(["yarn", "install"])

    if watch or build:
        yarn_path = shutil.which("yarn")
        assert yarn_path is not None
        os.execve(
            yarn_path,
            ["run"] + ["watch" if watch else "build"],
            env=os.environ,
        )
