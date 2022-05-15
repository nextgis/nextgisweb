from ..lib.i18n import trstr_factory

COMP_ID = 'webmap'
_ = trstr_factory(COMP_ID)


def webmap_items_to_tms_ids_list(webmap):
    if not webmap:
        raise TypeError

    root = webmap.root_item
    webmap_items = []

    def iterate(children):
        for item in children:
            if item.item_type == 'layer' and item.layer_style_id:
                webmap_items.append(item)
            if item.children:
                iterate(item.children)

    iterate(root.children)

    if webmap.draw_order_enabled:
        webmap_items.sort(key=lambda i: ((0, i.draw_order_position) if i.draw_order_position is not None else (1, 0)))

    webmap_items.reverse()

    return [i.layer_style_id for i in webmap_items]
