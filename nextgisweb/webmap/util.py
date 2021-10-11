from ..i18n import trstring_factory

COMP_ID = 'webmap'
_ = trstring_factory(COMP_ID)


def get_recursive_values(webmap, item_type='layer', attr_value='layer_style_id', attr_sort='position'):
    if not webmap:
        raise TypeError

    root = webmap.root_item
    values = []

    def iterate(children):
        for item in children:
            if item.item_type == item_type:
                if hasattr(item, attr_value) and hasattr(item, attr_sort):
                    values.append([getattr(item, attr_value), getattr(item, attr_sort)])

            if hasattr(item, 'children'):
                iterate(item.children)

    iterate(root.children)
    values.sort(key=lambda v: v[1])

    return [v[0] for v in values]
