import { makeAutoObservable, runInAction } from "mobx";

import { extractError } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { Blueprint } from "@nextgisweb/resource/type/api";

import type {
    Resource,
    ResourceClass,
    ResourceInterface,
    ResourceItem,
    ResourcePermission,
} from "../../../type/Resource";
import { loadParents } from "../../../util/loadParents";
import type { OnNewGroupType, ResourcePickerStoreOptions } from "../type";

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
    resources: ResourceItem[] = [];

    parentId = 0;

    get parentItem(): ResourceItem | null {
        return this._parentItem;
    }
    set parentItem(v: ResourceItem | null) {
        this._parentItem = v;
    }
    private _parentItem: ResourceItem | null = null;
    blueprint: Blueprint | null = null;

    setBreadcrumbItemsError: string | boolean = false;
    breadcrumbItemsLoading = false;
    breadcrumbItems: ResourceItem[] = [];

    createNewGroupLoading = false;
    createNewGroupError: string | boolean = false;

    hideUnavailable = false;

    disableResourceIds: number[] = [];

    requireClass?: ResourceClass;
    requireInterface?: ResourceInterface;
    requirePermission?: ResourcePermission;

    allowSelection = true;
    allowMoveInside = true;
    traverseClasses?: ResourceClass[];

    allowCreateResource = true;

    selected: number[] = [];

    multiple = false;

    readonly onNewGroup?: OnNewGroupType;
    readonly onTraverse?: (parentId: number) => void;

    setResourcesAbortController?: AbortController;
    setBreadcrumbItemsAbortController?: AbortController;
    createNewGroupAbortController?: AbortController;
    getSelectedParentAbortController?: AbortController;

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

        if (onNewGroup) {
            this.onNewGroup = onNewGroup;
        }
        if (onTraverse) {
            this.onTraverse = onTraverse;
        }
        if (disableResourceIds) {
            this.disableResourceIds = disableResourceIds;
        }
        if (multiple) {
            this.multiple = multiple;
        }
        if (requireClass) {
            this.requireClass = requireClass;
        }
        if (requireInterface) {
            this.requireInterface = requireInterface;
        }

        this.hideUnavailable = !!hideUnavailable;

        if (getSelectedMsg) {
            this.getSelectedMsg = getSelectedMsg;
        }
        if (getThisMsg) {
            this.getThisMsg = getThisMsg;
        }
        if (traverseClasses) {
            this.traverseClasses = traverseClasses;
        }
        makeAutoObservable<
            ResourcePickerStore,
            "_id" | "_saveLastParentIdGlobal"
        >(this, {
            _id: false,
            _saveLastParentIdGlobal: false,
            setResourcesAbortController: false,
            getSelectedParentAbortController: false,
            setBreadcrumbItemsAbortController: false,
            createNewGroupAbortController: false,
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
            if (this.onTraverse) {
                this.onTraverse(parent);
            }
        });
    }

    destroy = () => {
        this.abort();
    };

    getResourceClasses = (classes: ResourceClass[]): ResourceClass[] => {
        const resourceClasses: ResourceClass[] = [...classes];
        if (this.blueprint) {
            for (const cls of classes) {
                const blueprintResourceClasses = this.blueprint.resources[cls];
                if (blueprintResourceClasses) {
                    resourceClasses.push(
                        ...blueprintResourceClasses.base_classes
                    );
                }
            }
        }
        return resourceClasses;
    };

    checkEnabled = (resource: Resource): boolean => {
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
            const newSelected: number[] = [];
            // Imposable to remove disabled and already selected items
            for (const disabledId of this.disableResourceIds) {
                if (this.selected.includes(disabledId)) {
                    newSelected.push(disabledId);
                }
            }
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
        this._abortChildLoading();
        this._abortBreadcrumbsLoading();
        this._abortNewGroupCreation();
        this._abortSelectedParentLoading();
    }

    async setBreadcrumbItems(parent: number): Promise<void> {
        this._abortBreadcrumbsLoading();
        try {
            runInAction(() => {
                this.breadcrumbItemsLoading = true;
            });
            this.setBreadcrumbItemsAbortController = new AbortController();
            const parents = await loadParents(parent, {
                signal: this.setBreadcrumbItemsAbortController.signal,
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
        this._abortChildLoading();
        try {
            this.setResourcesAbortController = new AbortController();
            runInAction(() => {
                this.resourcesLoading = true;
            });
            const blueprint = await route("resource.blueprint").get({
                signal: this.setResourcesAbortController.signal,
                cache: true,
            });
            this.blueprint = blueprint;
            const parentItem = await route(
                "resource.item",
                parent
            ).get<ResourceItem>({
                signal: this.setResourcesAbortController.signal,
                cache: true,
            });
            this.parentItem = parentItem;
            const resp = await route("resource.collection").get<ResourceItem[]>(
                {
                    query: { parent: String(parent) },
                    signal: this.setResourcesAbortController.signal,
                }
            );
            const resources: ResourceItem[] = [];
            for (const x of resp) {
                const res = x.resource as Resource;
                const resourceVisible = this._resourceVisible(res);
                if (resourceVisible) {
                    resources.push(x);
                }
            }
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

    async createNewGroup(name: string): Promise<ResourceItem | undefined> {
        this._abortNewGroupCreation();
        try {
            this.createNewGroupAbortController = new AbortController();
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
            });

            await this.refresh();
            const newItem = [...this.resources].find(
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
        if (selected && selected.length) {
            this.selected = selected;
            try {
                runInAction(() => {
                    this.resourcesLoading = true;
                });
                this.getSelectedParentAbortController = new AbortController();
                const lastSelected: number = Array.isArray(selected)
                    ? selected[selected.length - 1]
                    : selected;
                const selectedItem = (await route(
                    "resource.item",
                    lastSelected
                ).get({
                    signal: this.getSelectedParentAbortController.signal,
                    cache: true,
                })) as ResourceItem;
                this.parentId = selectedItem.resource.parent.id;
            } catch {
                // ignore
            }
        }
        this.changeParentTo(this.parentId);
    }

    private _resourceVisible(resource: Resource): boolean {
        if (this.hideUnavailable) {
            return this._resourceAvailable(resource);
        }
        return true;
    }

    private _resourceAvailable(resource: Resource): boolean {
        const { cls, interfaces } = resource;
        const traverseClasses = this.traverseClasses;
        const requireClass = this.requireClass;
        const requireInterface = this.requireInterface;
        const checks: (() => boolean)[] = [];
        if (traverseClasses) {
            checks.push(() =>
                this.getResourceClasses([cls]).some((cls) =>
                    traverseClasses.includes(cls)
                )
            );
        }
        if (requireClass) {
            checks.push(() =>
                this.getResourceClasses([cls]).includes(requireClass)
            );
        }
        if (requireInterface) {
            checks.push(() => interfaces.includes(requireInterface));
        }
        return checks.length ? checks.some((c) => c()) : true;
    }

    private _abortChildLoading(): void {
        if (this.setResourcesAbortController) {
            this.setResourcesAbortController.abort();
        }
        this.setResourcesAbortController = undefined;
    }

    private _abortBreadcrumbsLoading(): void {
        if (this.setBreadcrumbItemsAbortController) {
            this.setBreadcrumbItemsAbortController.abort();
        }
        this.setBreadcrumbItemsAbortController = undefined;
    }

    private _abortSelectedParentLoading(): void {
        if (this.getSelectedParentAbortController) {
            this.getSelectedParentAbortController.abort();
        }
        this.getSelectedParentAbortController = undefined;
    }

    private _abortNewGroupCreation(): void {
        if (this.createNewGroupAbortController) {
            this.createNewGroupAbortController.abort();
        }
        this.createNewGroupAbortController = undefined;
    }
}
