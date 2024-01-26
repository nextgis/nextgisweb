export interface PermissionDataItem {
    key: string;
    label: string;
    value: boolean;
}

export interface PermissionData {
    key: string;
    label: string;
    items: PermissionDataItem[];
}
