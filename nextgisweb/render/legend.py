from dataclasses import dataclass
from typing import List

from PIL import Image

from nextgisweb.resource import IResourceBase


@dataclass
class LegendSymbol:
    display_name: str
    icon: Image


class ILegendSymbols(IResourceBase):
    def legend_symbols(self, icon_size: int) -> List[LegendSymbol]:
        pass
