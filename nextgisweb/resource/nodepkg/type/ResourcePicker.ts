import type { ResourcePermission, ResourceClass, ResourceInterface } from '../type/Resource';

export type OnNewGroupType = ((resource) => void);

export interface ResourcePickerStoreOptions {
    multiple: boolean;
    parentId: number;
    selected: number[];
    requireClass: ResourceClass | null;
    getThisMsg: string;
    onNewGroup: null | OnNewGroupType;
    disableResourceIds: number[];
    getSelectedMsg: string;
    requireInterface: ResourceInterface | null;
    traverseClasses: ResourceClass[] | null;
    requirePermission: ResourcePermission | null;
    hideUnavailable: boolean;
}
