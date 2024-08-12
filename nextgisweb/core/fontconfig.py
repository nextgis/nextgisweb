import re
from io import StringIO
from os import environ, sep
from pathlib import Path
from shutil import copyfile
from subprocess import check_output
from textwrap import dedent
from typing import List

from lxml import etree
from msgspec import Meta, Struct
from typing_extensions import Annotated

from nextgisweb.env import gettextf

from .component import CoreComponent
from .exception import ValidationError

FONT_PATTERN = r"^[A-Za-z0-9_\-]+\.(ttf|otf)$"
FONT_MAX_SIZE = 10485760

FontKey = Annotated[str, Meta(pattern=FONT_PATTERN)]


class BaseFont(Struct, kw_only=True):
    label: str
    format: str


class SystemFont(BaseFont, tag="system", tag_field="type"):
    pass  # System font has no key!


class CustomFont(BaseFont, tag="custom", tag_field="type"):
    key: FontKey


class FontConfig:
    def __init__(self, comp: CoreComponent):
        self.comp = comp

    def initialize(self):
        comp = self.comp
        comp.mksdir(comp)
        self.root_path = Path(comp.gtsdir(comp)) / "fontconfig"
        self.root_path.mkdir(exist_ok=True)
        fonts_conf = self.root_path / "fonts.conf"
        if not fonts_conf.exists():
            system = "/etc/fonts/fonts.conf"
            xml = f"""
                <?xml version="1.0"?>
                <!DOCTYPE fontconfig SYSTEM "fonts.dtd">
                <fontconfig>
                    <include ignore_missing="no" prefix="default">{system}</include>
                    <dir prefix="default">{self.root_path.absolute()}</dir>
                </fontconfig>
            """
            fonts_conf.write_text(dedent(xml).lstrip())

        # Let fontconfig know about the generated file
        environ["FONTCONFIG_FILE"] = str(fonts_conf)

    def enumerate(self) -> List[BaseFont]:
        props = ("file", "family", "style", "fontformat")
        fmt = "".join([f"<{f}>%{{{f}|xmlescape}}</{f}>" for f in props])
        out = check_output(["fc-list", "--format", f"<item>{fmt}</item>"], text=True)
        root = etree.parse(StringIO(f"<result>{out}</result>"), parser=etree.XMLParser())

        result = []
        root_prefix = str(self.root_path.absolute()) + sep
        for node in root.findall(".//item"):
            rec = {p: node.find(p).text for p in props}

            # Some fonts have multiple families and styles, last ones look
            # better, so let's use only last ones.
            family = rec["family"].split(",")[-1]
            style = rec["style"].split(",")[-1]

            kwargs = dict(
                label=f"{family} {style}".strip(),
                format=rec["fontformat"],
            )

            file = Path(rec["file"])
            if str(file).startswith(root_prefix):
                result.append(CustomFont(key=file.name, **kwargs))
            else:
                result.append(SystemFont(**kwargs))

        return result

    def add_font(self, key: FontKey, path: Path):
        assert re.fullmatch(FONT_PATTERN, key)
        target = self.root_path / key

        copyfile(path, target)  # Overwrite if exists

    def delete_font(self, key: FontKey):
        assert re.fullmatch(FONT_PATTERN, key)
        path = self.root_path / key

        if not path.is_file():
            raise ValidationError(gettextf("Font not found: {}!")(key))

        path.unlink()
