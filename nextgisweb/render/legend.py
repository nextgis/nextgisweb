from typing import List, Union

from msgspec import Struct
from PIL.Image import Image

from nextgisweb.resource import IResourceBase


class LegendSymbol(Struct, kw_only=True):
    index: int
    render: Union[bool, None]
    display_name: str
    icon: Image


class ILegendSymbols(IResourceBase):
    def legend_symbols(self, icon_size: int) -> List[LegendSymbol]:
        ...
