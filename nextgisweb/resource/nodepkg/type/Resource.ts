export type ResourceClass = string;
export type ResourceInterface = string;

interface Owneruser {
    id: number;
}

export interface ResourcePermission {
    action: string | null;
    principal: Owneruser | null;
    identity: string | null;
    scope: string | null;
    permission: string | null;
    propagate: boolean | null;
}

interface ResourceParentDeep {
    id?: number;
}
interface ResourceParent {
    id: number;
    parent: ResourceParentDeep;
}

export interface Resource {
    id: number;
    cls: ResourceClass;
    creation_date: string;
    parent: ResourceParent;
    owner_user: Owneruser;
    permissions: ResourcePermission[];
    keyname?: string;
    display_name: string;
    description?: string;
    children: boolean;
    interfaces: ResourceInterface[];
    scopes: string[];
}

export interface ResourceItem {
    resource: Resource;
}

export interface ResourceItemCreationResponse {
    id: number;
}

export interface ResourceVolume {
    volume: number;
}
