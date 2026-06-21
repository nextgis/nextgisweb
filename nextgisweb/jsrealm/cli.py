import json
import os
import shutil
from itertools import chain
from pathlib import Path
from subprocess import check_call
from typing import Any, Union

from nextgisweb.env import Env
from nextgisweb.env.cli import UninitializedEnvCommand, comp_cli, opt
from nextgisweb.env.package import pkginfo
from nextgisweb.lib.fileutil import update_text_file
from nextgisweb.lib.logging import logger

from nextgisweb.core import CoreComponent
from nextgisweb.jsrealm import Icon, JSEntry
from nextgisweb.pyramid import PyramidComponent
from nextgisweb.pyramid.uacompat import FAMILIES

from .component import JSRealmComponent
from .util import scan_for_nodepkgs


def create_tsconfig(npkgs: dict[str, Path], *, debug):
    paths = {"react": ["./node_modules/@types/react"]}

    compiler_options = dict(
        target="es2017",
        lib=["dom", "dom.iterable", "es2024"],
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
        types=["node", "mocha"],
        module="esnext",
        jsx="react-jsx",
        baseUrl=".",
        paths=paths,
    )

    include = []

    for pn, pp in npkgs.items():
        include.append(f"{pp}/**/*.ts")
        include.append(f"{pp}/**/*.tsx")
        paths[f"{pn}/*"] = [f"{pp}/*"]

    tsconfig_json = dict(
        compilerOptions=compiler_options,
        include=include,
        exclude=["node_modules"],
    )

    update_text_file(Path("tsconfig.json"), json.dumps(tsconfig_json, indent=4))


@comp_cli.command()
def install(
    self: UninitializedEnvCommand,
    watch: bool = opt(False),
    build: bool = opt(False),
    start: bool = opt(False),
    *,
    env: Env,
    core: CoreComponent,
    pyramid: PyramidComponent,
    jsrealm: JSRealmComponent,
):
    """Setup JavaScript environment

    :param watch: Start `pnpm run watch` after installation
    :param build: Start `pnpm run build` after installation
    :param start: Start `pnpm run start` after installation"""

    from babel.messages.plurals import PLURALS

    run_flags = [watch, build, start]
    if sum(run_flags) > 1:
        raise RuntimeError("Flags --watch, --build and --start are mutually exclusive.")

    # NOTE: It loads modules using Component.setup_pyramid, which may register
    # entrypoints using jsentry.
    for comp in env.chain("client_codegen"):
        comp.client_codegen()

    debug = core.options["debug"]
    cwd = Path().resolve()

    cpaths = dict()
    for cid, cpath in pkginfo._comp_path.items():
        cpath = cpath.resolve().relative_to(cwd)
        if cid not in env.components and debug:
            logger.debug("Component [%s] excluded from build in debug mode", cid)
            continue
        cpaths[cid] = cpath

    npkgs = {
        pname: ppath
        for pname, ppath in chain(
            *[scan_for_nodepkgs(cid, cpath) for cid, cpath in cpaths.items()]
        )
    }

    package_json: dict[str, Union[dict, str, bool]] = dict(private=True)
    package_json["packageManager"] = "pnpm@11.2.2"
    package_json["engines"] = dict(node=">=22.0.0")
    package_json["nextgisweb"] = nextgisweb = dict()

    package_json["dependencies"] = {pname: "workspace:*" for pname in sorted(npkgs.keys())}

    s_env = nextgisweb["env"] = dict()
    s_env["packages"] = {
        name: str(pkg._path.relative_to(cwd)) for name, pkg in pkginfo.packages.items()
    }
    s_env["components"] = {
        comp_id: str(pkginfo.comp_path(comp_id).relative_to(cwd)) for comp_id in pkginfo.components
    }

    s_allow_builds = dict()
    s_overrides = dict()

    peer_dependencies = package_json["peerDependencies"] = {}
    for ppath in npkgs.values():
        package_data = json.loads((ppath / "package.json").read_text())

        overrides = package_data.get("overrides")
        if isinstance(overrides, dict):
            s_overrides.update(overrides)

        allow_builds = package_data.get("allowBuilds")
        if isinstance(allow_builds, dict):
            s_allow_builds.update(allow_builds)

        # Collect dependencies to provide auto-imports in the IDE To use package
        # dependencies, ensure `commonDependencies: true` is included in the
        # `nextgisweb` section of the module's package.json
        if debug:
            if (
                (package_nextgisweb := package_data.get("nextgisweb"))
                and (package_dependencies := package_data.get("dependencies"))
                and package_nextgisweb.get("commonDependencies")
            ):
                peer_dependencies.update({k: "*" for k in package_dependencies.keys()})

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

    s_jsrealm["entries"] = [
        (i.component, i.module)
        for i in sorted(
            JSEntry.registry,
            key=lambda entry: (
                entry.component,
                entry.module,
            ),
        )
    ]

    s_jsrealm["icons"] = [
        (i.collection, i.glyph, i.variant)
        for i in sorted(
            Icon.registry,
            key=lambda icon: (
                icon.collection,
                icon.glyph,
                icon.variant,
            ),
        )
    ]

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

    rsbuild_root = (jsrealm_path / "rsbuild.root.ts").resolve().relative_to(cwd)

    package_json["scripts"] = scripts = dict()
    scripts["build"] = "rsbuild build --config {}".format(rsbuild_root)
    scripts["start"] = "rsbuild dev --config {}".format(rsbuild_root)
    scripts["watch"] = "rsbuild build --watch --config {}".format(rsbuild_root)

    scripts["check:types"] = "tsc --noEmit -p tsconfig.json"
    scripts["watch:types"] = "tsc --watch -p tsconfig.json"

    workspace_paths: list[str] = [str(pp) for pp in npkgs.values()]

    pnpm_workspace_json: dict[str, Any] = {
        "packages": workspace_paths,
        "nodeLinker": "hoisted",
        "updateNotifier": False,
        "hoistWorkspacePackages": True,
        "shamefullyHoist": True,
    }

    if s_allow_builds:
        pnpm_workspace_json["allowBuilds"] = {
            package: allowed for package, allowed in s_allow_builds.items()
        }

    if s_overrides:
        pnpm_workspace_json["overrides"] = {
            package: version for package, version in s_overrides.items()
        }

    update_text_file(Path("package.json"), json.dumps(package_json, indent=4))
    update_text_file(
        Path("pnpm-workspace.yaml"),
        json.dumps(pnpm_workspace_json, indent=2),
    )

    create_tsconfig(npkgs, debug=debug)

    ngw_root = pkginfo.packages["nextgisweb"]._path.parent
    pkg_root = ngw_root.parent
    if len(list(pkg_root.glob("nextgisweb_*"))) > 0:
        linters_configs = ["eslint.config.cjs", ".prettierrc.cjs", ".editorconfig"]
        for lc in linters_configs:
            tf = pkg_root / lc
            if tf.exists():
                continue
            tf.symlink_to((ngw_root / lc).relative_to(pkg_root))

    pnpm_lockfile = Path("pnpm-lock.yaml")
    pnpm_lockfile_mtime = pnpm_lockfile.stat().st_mtime if pnpm_lockfile.exists() else None

    check_call(
        ["pnpm", "install"],
        env={**os.environ, "COREPACK_ENABLE_DOWNLOAD_PROMPT": "0"},
    )

    assert pnpm_lockfile.exists(), "pnpm-lock.yaml not created"
    if pnpm_lockfile_mtime and pnpm_lockfile.stat().st_mtime != pnpm_lockfile_mtime:
        logger.info("pnpm-lock.yaml updated, running pnpm dedupe")
        check_call(["pnpm", "dedupe", "--prefer-offline"])

    if watch or build or start:
        pnpm_path = shutil.which("pnpm")
        assert pnpm_path is not None
        script = "start" if start else "watch" if watch else "build"
        os.execve(
            pnpm_path,
            ["pnpm", "run", script],
            env=os.environ,
        )
