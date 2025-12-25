from msgspec import Struct
from PIL.Image import Image

from nextgisweb.lib.i18n import TrStr

from nextgisweb.resource import IResourceBase


class LegendSymbol(Struct, kw_only=True):
    index: int
    render: bool | None
    display_name: str | TrStr
    icon: Image


class ILegendSymbols(IResourceBase):
    def legend_symbols(self, icon_size: int) -> list[LegendSymbol]: ...
