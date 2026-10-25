import sys
from collections.abc import Sequence
from pathlib import Path


def module_path(module_name: str, /) -> Path:
    """Extract module's path from sys.modules and sys.meta_path.

    Importlib's find_spec() is always importing the top-level package for
    modules which causes problems with single-component packages.
    """

    rest = module_name.split(".")
    root = rest.pop(0)

    if root_mod := sys.modules.get(root):
        root_file = root_mod.__file__
        assert root_file is not None
        root_path = Path(root_file)
    else:
        for mp in sys.meta_path:
            if root_spec := mp.find_spec(root, None):
                root_origin = root_spec.origin
                assert root_origin is not None
                root_path = Path(root_origin)
                break
        else:
            raise ValueError(f"{module_name} not found")

    assert root_path.name == "__init__.py"
    root_path = root_path.parent

    return (root_path / "/".join(rest)) if rest else root_path


def module_from_stack(depth: int = 0, *, skip: Sequence[str] | None = None) -> str:
    """Extract module name from stack.

    :param depth: Number of stack frames to skip before searching. A value of 0 starts at the
        caller's caller, so a depth of 1 would start at the caller's caller's caller.
    :param skip: Module name prefixes to ignore during the search.
    :return: Name of the first matching module.
    """

    if skip is not None:
        skip = tuple(m if m.endswith(".") else (m + ".") for m in skip)

    cur_depth = 2 + depth
    while True:
        fr = sys._getframe(cur_depth)
        mod = fr.f_globals["__name__"]
        mod_dot = mod + "."
        if (
            mod.startswith("_")
            or mod_dot.startswith("importlib.")
            or (skip and mod_dot.startswith(skip))
        ):
            cur_depth += 1
        else:
            return mod
