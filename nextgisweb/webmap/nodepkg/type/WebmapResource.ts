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

interface RootItem {
    item_type: "root";
    children: TreeItem[];
}

export type AnnotationType = "yes" | "no";

export interface BookmarkResource {
    id: number;
    parent: {
        id: number;
    };
}

export interface WebmapResource {
    legend_syion_default?: string;
    extent_left: number;
    extent_right: number;
    extent_bottom: number;
    extent_top: number;
    extent_const_left?: number | null;
    extent_const_right?: number | null;
    extent_const_bottom?: number | null;
    extent_const_top?: number | null;
    draw_order_enabled?: boolean | null;
    editable: boolean;
    annotation_enabled: boolean;
    annotation_default: AnnotationType;
    legend_symbols: string;
    bookmark_resource?: BookmarkResource | null;
    root_item: RootItem;
    measure_srs?: { id: number } | null;
}
