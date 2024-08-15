import { action, observable, runInAction } from "mobx";

import { extractError } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    Blueprint,
    CompositeRead,
    ResourceCls,
    ResourceRead,
} from "@nextgisweb/resource/type/api";

import type { ResourceInterface } from "../../../type/Resource";
import { loadParents } from "../../../util/loadParents";
import type { OnNewGroupType, ResourcePickerStoreOptions } from "../type";

type AbortOperation =
    | "setResources"
    | "setBreadcrumbItems"
    | "createNewGroup"
    | "getSelectedParent";

const msgPickThis = gettext("Pick this group");
const msgPickSelected = gettext("Pick selected");

let ID = 0;

export class ResourcePickerStore implements ResourcePickerStoreOptions {
    static GLOBAL_PARENT_ID?: number = undefined;
    static resetGlobalParentId = () => {
        ResourcePickerStore.GLOBAL_PARENT_ID = undefined;
    };

    private readonly _id = ID++;

    @observable accessor resourcesLoadError: string | boolean = false;
    @observable accessor resourcesLoading = false;
    @observable accessor resources: CompositeRead[] = [];

    @observable accessor parentId: number = 0;

    @observable.ref accessor parentItem: CompositeRead | null = null;

    @observable.ref accessor blueprint: Blueprint | null = null;

    @observable accessor setBreadcrumbItemsError: string | boolean = false;
    @observable accessor breadcrumbItemsLoading = false;
    @observable accessor breadcrumbItems: CompositeRead[] = [];

    @observable accessor createNewGroupLoading = false;
    @observable accessor createNewGroupError: string | boolean = false;

    @observable accessor hideUnavailable = false;
    @observable accessor disableResourceIds: number[] = [];

    @observable accessor requireClass: ResourceCls | null = null;
    @observable accessor requireInterface: ResourceInterface | null = null;

    @observable accessor allowSelection = true;
    @observable accessor allowMoveInside = true;
    @observable accessor traverseClasses: ResourceCls[] | null = null;

    @observable accessor allowCreateResource = true;
    @observable accessor selected: number[] = [];
    @observable accessor multiple = false;

    @observable accessor getThisMsg = msgPickThis;
    @observable accessor getSelectedMsg = msgPickSelected;

    @observable accessor saveLastParentIdGlobal = false;

    readonly onNewGroup: OnNewGroupType | null = null;
    readonly onTraverse: ((parentId: number) => void) | null = null;
    readonly initialParentId: number = 0;

    private abortControllers: Partial<Record<AbortOperation, AbortController>> =
        {};

    constructor({
        multiple,
        parentId,
        selected,
        getThisMsg,
        onNewGroup,
        onTraverse,
        requireClass,
        getSelectedMsg,
        hideUnavailable,
        requireInterface,
        traverseClasses,
        disableResourceIds,
        saveLastParentIdGlobal,
    }: ResourcePickerStoreOptions) {
        if (saveLastParentIdGlobal && ResourcePickerStore.GLOBAL_PARENT_ID) {
            this.saveLastParentIdGlobal = saveLastParentIdGlobal;
            parentId = ResourcePickerStore.GLOBAL_PARENT_ID;
        }

        this.parentId = parentId ?? this.parentId;
        this.initialParentId = this.parentId;

        this.onNewGroup = onNewGroup ?? null;
        this.onTraverse = onTraverse ?? null;
        this.disableResourceIds = disableResourceIds ?? [];
        this.multiple = multiple ?? false;
        this.requireClass = requireClass ?? null;
        this.requireInterface = requireInterface ?? null;
        this.hideUnavailable = !!hideUnavailable;
        this.getSelectedMsg = getSelectedMsg ?? msgPickSelected;
        this.getThisMsg = getThisMsg ?? msgPickThis;
        this.traverseClasses = traverseClasses ?? null;

        this._initialize({ selected, parentId });
    }

    @action
    async changeParentTo(parent: number) {
        this.setChildrenFor(parent);
        this.setBreadcrumbItems(parent);

        this.parentId = parent;
        if (this.saveLastParentIdGlobal) {
            ResourcePickerStore.GLOBAL_PARENT_ID = parent;
        }
        this.onTraverse?.(parent);
    }

    destroy() {
        this.abort();
    }

    getResourceClasses = (classes: ResourceCls[]): ResourceCls[] => {
        const resourceClasses: ResourceCls[] = [...classes];
        const blueprint = this.blueprint;
        if (blueprint) {
            for (const cls of classes) {
                const blueprintResourceClasses = blueprint.resources[cls];
                if (blueprintResourceClasses) {
                    resourceClasses.push(
                        ...blueprintResourceClasses.base_classes
                    );
                }
            }
        }
        return resourceClasses;
    };

    checkEnabled = (resource: ResourceRead): boolean => {
        const checks: (() => boolean)[] = [];
        const requireClass = this.requireClass;
        const requireInterface = this.requireInterface;
        if (requireClass) {
            checks.push(() =>
                this.getResourceClasses([resource.cls]).includes(requireClass)
            );
        }
        if (requireInterface) {
            checks.push(() =>
                resource.interfaces.some((intf) => requireInterface === intf)
            );
        }
        return checks.length ? checks.some((c) => c()) : true;
    };

    refresh() {
        return this.setChildrenFor(this.parentId);
    }

    returnToInitial(): void {
        this.changeParentTo(this.initialParentId);
    }

    @action
    setSelected(selected: number[]): void {
        const newSelected = this.disableResourceIds.filter((id) =>
            this.selected.includes(id)
        );
        for (const s of selected) {
            if (!newSelected.includes(s)) {
                newSelected.push(s);
            }
        }
        this.selected = newSelected;
    }

    clearSelection = (): void => {
        this.setSelected([]);
    };

    @action
    setAllowSelection(status: boolean): void {
        this.allowSelection = status;
    }

    @action
    setAllowMoveInside(status: boolean): void {
        this.allowMoveInside = status;
    }

    @action
    setAllowCreateResource(status: boolean): void {
        this.allowCreateResource = status;
    }

    abort(): void {
        Object.keys(this.abortControllers).forEach((key) => {
            this._abortOperation(key as AbortOperation);
        });
    }

    private _abortOperation<T extends boolean = false>(
        operation: AbortOperation,
        reset?: T
    ): T extends true ? AbortController : undefined {
        if (this.abortControllers[operation]) {
            this.abortControllers[operation]!.abort();
        }
        const val = reset ? new AbortController() : undefined;
        this.abortControllers[operation] = val;
        return val as T extends true ? AbortController : undefined;
    }

    @action
    async setBreadcrumbItems(parent: number): Promise<void> {
        const abort = this._abortOperation("setBreadcrumbItems", true);
        try {
            this.breadcrumbItemsLoading = true;
            const parents = await loadParents(parent, {
                signal: abort.signal,
            });

            this.breadcrumbItems = parents;
        } catch (er) {
            const { title } = extractError(er as ApiError);
            runInAction(() => {
                this.setBreadcrumbItemsError = title;
            });
            throw new Error(String(er));
        } finally {
            this.breadcrumbItemsLoading = false;
        }
    }

    @action
    async setChildrenFor(parent: number): Promise<void> {
        const abort = this._abortOperation("setResources", true);
        try {
            this.resourcesLoading = true;
            this.blueprint = await route("resource.blueprint").get({
                signal: abort.signal,
                cache: true,
            });
            this.parentItem = await route("resource.item", parent).get({
                signal: abort.signal,
                cache: true,
            });
            const resp = await route("resource.collection").get({
                query: { parent: parent },
                signal: abort.signal,
            });
            const resources = resp.filter((x: CompositeRead) =>
                this._resourceVisible(x.resource)
            );

            this.resources = resources;
        } catch (er) {
            const { title } = extractError(er as ApiError);
            this.resourcesLoadError = title;
            throw new Error(String(er));
        } finally {
            this.resourcesLoading = false;
        }
    }

    @action
    async createNewGroup(name: string): Promise<CompositeRead | undefined> {
        const abort = this._abortOperation("createNewGroup", true);
        try {
            this.createNewGroupLoading = true;

            const payload = {
                resource: {
                    display_name: name,
                    keyname: null,
                    parent: {
                        id: this.parentId,
                    },
                    cls: "resource_group",
                },
            };
            const createdItem = await route("resource.collection").post<{
                id: number;
            }>({
                json: payload,
                signal: abort.signal,
            });

            await this.refresh();
            const newItem = this.resources.find(
                (c) => c.resource.id === createdItem.id
            );

            if (newItem) {
                if (this.onNewGroup) {
                    this.onNewGroup(newItem);
                }
                return newItem;
            }
        } catch (er) {
            const { title } = extractError(er as ApiError);
            this.createNewGroupError = title;
            throw er;
        } finally {
            this.createNewGroupLoading = false;
        }
    }

    @action
    private async _initialize({ selected }: ResourcePickerStoreOptions) {
        if (selected?.length) {
            this.selected = selected;
            try {
                this.resourcesLoading = true;
                const abort = this._abortOperation("getSelectedParent", true);
                const lastSelected = selected[selected.length - 1];
                const selectedItem = await route(
                    "resource.item",
                    lastSelected
                ).get({
                    signal: abort.signal,
                    cache: true,
                });
                this.parentId =
                    selectedItem.resource.parent?.id ?? this.parentId;
            } catch {
                // ignore
            }
        }
        this.changeParentTo(this.parentId);
    }

    private _resourceVisible(resource: ResourceRead): boolean {
        return !this.hideUnavailable || this._resourceAvailable(resource);
    }

    private _resourceAvailable(resource: ResourceRead): boolean {
        const { cls, interfaces } = resource;
        const checks: (() => boolean)[] = [];
        if (this.traverseClasses) {
            checks.push(() =>
                this.getResourceClasses([cls]).some((cls) =>
                    this.traverseClasses!.includes(cls)
                )
            );
        }
        if (this.requireClass) {
            checks.push(() =>
                this.getResourceClasses([cls]).includes(this.requireClass!)
            );
        }
        if (this.requireInterface) {
            checks.push(() => interfaces.includes(this.requireInterface!));
        }
        return checks.length ? checks.some((c) => c()) : true;
    }
}
