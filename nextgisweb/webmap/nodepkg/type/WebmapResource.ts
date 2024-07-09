export interface LayerItem {
    item_type: "layer";
    display_name: string;
    layer_enabled: boolean;
    layer_identifiable: boolean;
    layer_transparency?: number | null;
    layer_style_id: number;
    layer_min_scale_denom?: number | null;
    layer_max_scale_denom?: number | null;
    layer_adapter: string;
    draw_order_position?: number | null;
    legend_symbols?: string | null;
    style_parent_id?: number;
}

export type TreeItem = GroupItem | LayerItem;

export interface GroupItem {
    display_name: string;
    group_expanded: boolean;
    group_exclusive: boolean;
    item_type: "group";
    children?: TreeItem[];
}
