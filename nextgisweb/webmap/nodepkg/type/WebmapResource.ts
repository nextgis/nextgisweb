export interface LayerItem {
    item_type: "layer";
    display_name: string;
    layer_enabled: boolean;
    layer_identifiable: boolean;
    layer_transparency?: any;
    layer_style_id: number;
    layer_min_scale_denom?: any;
    layer_max_scale_denom?: any;
    layer_adapter: string;
    draw_order_position?: any;
    legend_symbols?: any;
    style_parent_id?: number;
}

export type TreeItem = GroupItem | LayerItem;

export interface GroupItem {
    display_name: string;
    group_expanded: boolean;
    item_type: "group";
    children?: TreeItem[];
}

interface Rootitem {
    item_type: "root";
    children: TreeItem[];
}

export interface WebmapResource {
    extent_left: number;
    extent_right: number;
    extent_bottom: number;
    extent_top: number;
    extent_const_left?: any;
    extent_const_right?: any;
    extent_const_bottom?: any;
    extent_const_top?: any;
    draw_order_enabled?: any;
    editable: boolean;
    annotation_enabled: boolean;
    annotation_default: string;
    legend_symbols: string;
    bookmark_resource?: any;
    root_item: Rootitem;
}
