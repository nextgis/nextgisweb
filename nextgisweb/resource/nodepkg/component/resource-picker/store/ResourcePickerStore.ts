import { makeAutoObservable, runInAction } from "mobx";

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

    resourcesLoadError: string | boolean = false;
    resourcesLoading = false;
    resources: CompositeRead[] = [];

    parentId: number = 0;

    get parentItem(): CompositeRead | null {
        return this._parentItem;
    }
    set parentItem(v: CompositeRead | null) {
        this._parentItem = v;
    }
    private _parentItem: CompositeRead | null = null;
    blueprint: Blueprint | null = null;

    setBreadcrumbItemsError: string | boolean = false;
    breadcrumbItemsLoading = false;
    breadcrumbItems: CompositeRead[] = [];

    createNewGroupLoading = false;
    createNewGroupError: string | boolean = false;

    hideUnavailable = false;

    disableResourceIds: number[] = [];

    requireClass: ResourceCls | null = null;
    requireInterface: ResourceInterface | null = null;

    allowSelection = true;
    allowMoveInside = true;
    traverseClasses: ResourceCls[] | null = null;

    allowCreateResource = true;

    selected: number[] = [];

    multiple = false;

    readonly onNewGroup: OnNewGroupType | null = null;
    readonly onTraverse: ((parentId: number) => void) | null = null;

    private abortControllers: Partial<Record<AbortOperation, AbortController>> =
        {};

    getThisMsg = msgPickThis;
    getSelectedMsg = msgPickSelected;

    private _saveLastParentIdGlobal = false;

    readonly initialParentId: number = 0;

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
            this._saveLastParentIdGlobal = saveLastParentIdGlobal;
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

        makeAutoObservable<
            ResourcePickerStore,
            "_id" | "_saveLastParentIdGlobal" | "abortControllers"
        >(this, {
            _id: false,
            _saveLastParentIdGlobal: false,
            abortControllers: false,
        });
        this._initialize({ selected, parentId });
    }

    async changeParentTo(parent: number) {
        this.setChildrenFor(parent);
        this.setBreadcrumbItems(parent);
        runInAction(() => {
            this.parentId = parent;
            if (this._saveLastParentIdGlobal) {
                ResourcePickerStore.GLOBAL_PARENT_ID = parent;
            }
            this.onTraverse?.(parent);
        });
    }

    destroy = () => {
        this.abort();
    };

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

    setSelected(selected: number[]): void {
        runInAction(() => {
            // Imposable to remove disabled and already selected items
            const newSelected = this.disableResourceIds.filter((id) =>
                this.selected.includes(id)
            );
            for (const s of selected) {
                if (!newSelected.includes(s)) {
                    newSelected.push(s);
                }
            }
            this.selected = newSelected;
        });
    }

    clearSelection = (): void => {
        this.setSelected([]);
    };

    setAllowSelection(status: boolean): void {
        runInAction(() => {
            this.allowSelection = status;
        });
    }

    setAllowMoveInside(status: boolean): void {
        runInAction(() => {
            this.allowMoveInside = status;
        });
    }

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

    async setBreadcrumbItems(parent: number): Promise<void> {
        const abort = this._abortOperation("setBreadcrumbItems", true);
        try {
            runInAction(() => {
                this.breadcrumbItemsLoading = true;
            });

            const parents = await loadParents(parent, {
                signal: abort.signal,
            });
            runInAction(() => {
                this.breadcrumbItems = parents;
            });
        } catch (er) {
            const { title } = extractError(er as ApiError);
            runInAction(() => {
                this.setBreadcrumbItemsError = title;
            });
            throw new Error(String(er));
        } finally {
            runInAction(() => {
                this.breadcrumbItemsLoading = false;
            });
        }
    }

    async setChildrenFor(parent: number): Promise<void> {
        const abort = this._abortOperation("setResources", true);
        try {
            runInAction(() => {
                this.resourcesLoading = true;
            });
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
            runInAction(() => {
                this.resources = resources;
            });
        } catch (er) {
            const { title } = extractError(er as ApiError);
            runInAction(() => {
                this.resourcesLoadError = title;
            });
            throw new Error(String(er));
        } finally {
            runInAction(() => {
                this.resourcesLoading = false;
            });
        }
    }

    async createNewGroup(name: string): Promise<CompositeRead | undefined> {
        const abort = this._abortOperation("createNewGroup", true);
        try {
            runInAction(() => {
                this.createNewGroupLoading = true;
            });

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
            runInAction(() => {
                this.createNewGroupError = title;
            });
            throw er;
        } finally {
            runInAction(() => {
                this.createNewGroupLoading = false;
            });
        }
    }

    private async _initialize({ selected }: ResourcePickerStoreOptions) {
        if (selected?.length) {
            this.selected = selected;
            try {
                runInAction(() => {
                    this.resourcesLoading = true;
                });
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
