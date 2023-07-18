import { makeAutoObservable, runInAction } from "mobx";

import { extractError } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";

import { Blueprint } from "../../../type/Blueprint";
import type {
    Resource,
    ResourceClass,
    ResourceInterface,
    ResourceItem,
    ResourcePermission,
} from "../../../type/Resource";
import { loadParents } from "../../../util/loadParents";
import type { OnNewGroupType, ResourcePickerStoreOptions } from "../type";

import i18n from "@nextgisweb/pyramid/i18n";

const mPickThis = i18n.gettext("Pick this group");
const mPickSelected = i18n.gettext("Pick selected");

let ID = 0;

export class ResourcePickerStore implements ResourcePickerStoreOptions {
    readonly _id = ID++;

    resourcesLoadError = false;
    resourcesLoading = false;
    resources: ResourceItem[] = [];

    parentId = 0;

    parentItem: ResourceItem | null = null;
    blueprint: Blueprint | null = null;

    setBreadcrumbItemsError = false;
    breadcrumbItemsLoading = false;
    breadcrumbItems: ResourceItem[] = [];

    createNewGroupLoading = false;
    createNewGroupError = false;

    hideUnavailable = false;

    disableResourceIds: number[] = [];

    requireClass: ResourceClass | null = null;
    requireInterface: ResourceInterface | null = null;
    requirePermission: ResourcePermission | null = null;

    allowSelection = true;
    allowMoveInside = true;
    traverseClasses: ResourceClass[] | null = null;

    allowCreateResource = true;

    selected: number[] = [];

    multiple = false;

    onNewGroup: null | OnNewGroupType = null;

    setChildrenAbortController: AbortController | null = null;
    setBreadcrumbItemsAbortController: AbortController | null = null;
    createNewGroupAbortController: AbortController | null = null;

    getThisMsg = mPickThis;
    getSelectedMsg = mPickSelected;

    readonly initialParentId: number = 0;

    constructor({
        multiple,
        parentId,
        selected,
        getThisMsg,
        onNewGroup,
        requireClass,
        getSelectedMsg,
        hideUnavailable,
        requireInterface,
        traverseClasses,
        disableResourceIds,
    }: Partial<ResourcePickerStoreOptions>) {
        this.parentId = parentId ?? this.parentId;
        this.initialParentId = this.parentId;

        if (onNewGroup) {
            this.onNewGroup = onNewGroup;
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
        makeAutoObservable(this, {
            _id: false,
            setChildrenAbortController: false,
            setBreadcrumbItemsAbortController: false,
            createNewGroupAbortController: false,
        });
        this.changeParentTo(this.parentId);
        if (selected) {
            this.selected = selected;
        }
    }

    async changeParentTo(parent) {
        // this.clearSelection();
        runInAction(() => {
            this.parentId = parent;
            this.setChildrenFor(parent);
            this.setBreadcrumbItems(parent);
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

    checkEnabled(resource: Resource): boolean {
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
    }

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
            const { title } = extractError(er);
            runInAction(() => {
                this.setBreadcrumbItemsError = title;
            });
            throw new Error(er);
        } finally {
            runInAction(() => {
                this.breadcrumbItemsLoading = false;
            });
        }
    }

    async setChildrenFor(parent: number): Promise<void> {
        this._abortChildLoading();
        try {
            this.setChildrenAbortController = new AbortController();
            runInAction(() => {
                this.resourcesLoading = true;
            });
            const blueprint = await route("resource.blueprint").get({
                signal: this.setChildrenAbortController.signal,
                cache: true,
            });
            this.blueprint = blueprint;
            const parentItem = await route("resource.item", parent).get({
                signal: this.setChildrenAbortController.signal,
                cache: true,
            });
            this.parentItem = parentItem;
            const resp = await route("resource.collection").get({
                query: { parent },
                signal: this.setChildrenAbortController.signal,
            });
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
            const { title } = extractError(er);
            runInAction(() => {
                this.resourcesLoadError = title;
            });
            throw new Error(er);
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
            const createdItem = await route("resource.collection").post({
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
            const { title } = extractError(er);
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
        if (this.setChildrenAbortController) {
            this.setChildrenAbortController.abort();
        }
        this.setChildrenAbortController = null;
    }

    private _abortBreadcrumbsLoading(): void {
        if (this.setBreadcrumbItemsAbortController) {
            this.setBreadcrumbItemsAbortController.abort();
        }
        this.setBreadcrumbItemsAbortController = null;
    }

    private _abortNewGroupCreation(): void {
        if (this.createNewGroupAbortController) {
            this.createNewGroupAbortController.abort();
        }
        this.createNewGroupAbortController = null;
    }
}
