interface Resource {
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    manage_children: boolean;
    change_permissions: boolean;
}

interface Data {
    read: boolean;
    write: boolean;
}

export interface Permission {
    data: Data;
    resource: Resource;
    metadata: Data;
    datastruct: Data;
}
