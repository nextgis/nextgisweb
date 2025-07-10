from pathlib import Path


def change_suffix(name: str, suffix: str) -> str:
    p = Path(name)
    if p.suffix == "":
        return name
    if p.suffix.isupper():
        suffix = suffix.upper()
    return str(p.with_suffix(suffix))
