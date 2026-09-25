from collections.abc import Iterable, Sequence
from sys import maxsize

from .model import WebMap, WebMapItem


def webmap_items_to_tms_ids_list(webmap: WebMap) -> Sequence[int]:
    items: list[tuple[int, int]] = []  # List of (draw_order_position, layer_style_id)

    def iterate(children: Iterable[WebMapItem]):
        nonlocal items
        for item in children:
            if item.item_type == "layer" and item.layer_style_id:
                draw_order_position = item.draw_order_position
                if draw_order_position is None:
                    draw_order_position = maxsize
                items.append((draw_order_position, item.layer_style_id))
            if item.children:
                iterate(item.children)

    iterate(webmap.root_item.children)

    if webmap.draw_order_enabled:
        items.sort(key=lambda i: i[0])

    items.reverse()

    return [i[1] for i in items]
