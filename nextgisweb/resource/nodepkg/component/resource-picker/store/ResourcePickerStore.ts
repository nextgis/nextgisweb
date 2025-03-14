import { action, observable } from "mobx";

import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    Blueprint,
    CompositeCreate,
    CompositeRead,
    ResourceCls,
    ResourceInterface,
    ResourceRead,
} from "@nextgisweb/resource/type/api";
import { loadParents } from "@nextgisweb/resource/util/loadParents";

import type { OnNewGroupType, ResourcePickerStoreOptions } from "../type";

import { actionHandler } from "./decorator/actionHandler";

type Action = keyof Pick<
    ResourcePickerStore,
    | "setChildrenFor"
    | "setBreadcrumbItemsFor"
    | "createNewGroup"
    | "getSelectedParent"
>;

const msgPickThis = gettext("Pick this group");
const msgPickSelected = gettext("Pick selected");

export class ResourcePickerStore
    implements
        Omit<ResourcePickerStoreOptions, "requireClass" | "requireInterface">
{
    static GLOBAL_PARENT_ID?: number = undefined;
    static resetGlobalParentId = () => {
        ResourcePickerStore.GLOBAL_PARENT_ID = undefined;
    };

    @observable.ref accessor parentItem: CompositeRead | null = null;
    @observable.ref accessor blueprint: Blueprint | null = null;

    @observable.shallow accessor resources: CompositeRead[] | null = null;
    @observable accessor parentId: number = 0;
    @observable.shallow accessor breadcrumbItems: CompositeRead[] = [];
    @observable accessor hideUnavailable = false;
    @observable.shallow accessor disableResourceIds: number[] = [];
    @observable.shallow accessor requireClass: ResourceCls[] = [];
    @observable.shallow accessor requireInterface: ResourceInterface[] = [];
    @observable accessor allowSelection = true;
    @observable accessor allowMoveInside = true;
    @observable.shallow accessor traverseClasses: ResourceCls[] | null = null;
    @observable accessor allowCreateResource = true;
    @observable.shallow accessor selected: number[] = [];
    @observable accessor multiple = false;
    @observable accessor saveLastParentIdGlobal = false;
    @observable accessor getThisMsg = msgPickThis;
    @observable accessor getSelectedMsg = msgPickSelected;
    @observable.shallow accessor errors: Partial<Record<Action, string>> = {};
    @observable.shallow accessor loading: Partial<Record<Action, boolean>> = {};

    readonly onNewGroup: OnNewGroupType | null = null;
    readonly onTraverse: ((parentId: number) => void) | null = null;
    readonly initParentId: number = 0;

    private abortControllers: Partial<Record<Action, AbortController>> = {};

    constructor({
        multiple,
        parentId,
        selected,
        getThisMsg,
        onNewGroup,
        onTraverse,
        initParentId,
        requireClass,
        getSelectedMsg,
        hideUnavailable,
        traverseClasses,
        requireInterface,
        disableResourceIds,
        saveLastParentIdGlobal,
    }: ResourcePickerStoreOptions) {
        if (saveLastParentIdGlobal) {
            this.saveLastParentIdGlobal = saveLastParentIdGlobal;
            parentId = ResourcePickerStore.GLOBAL_PARENT_ID;
        }

        this.parentId = parentId ?? initParentId ?? this.parentId;
        this.initParentId = initParentId ?? this.parentId;

        this.onNewGroup = onNewGroup ?? null;
        this.onTraverse = onTraverse ?? null;
        this.disableResourceIds = disableResourceIds ?? [];
        this.multiple = multiple ?? false;
        this.requireClass = Array.isArray(requireClass)
            ? requireClass
            : requireClass
              ? [requireClass]
              : [];
        this.requireInterface = Array.isArray(requireInterface)
            ? requireInterface
            : requireInterface
              ? [requireInterface]
              : [];
        this.hideUnavailable = !!hideUnavailable;
        this.getSelectedMsg = getSelectedMsg ?? msgPickSelected;
        this.getThisMsg = getThisMsg ?? msgPickThis;
        this.traverseClasses = traverseClasses ?? null;

        this.getSelectedParent({ selected, parentId });
    }

    @action
    changeParentTo(parent: number) {
        if (this.resources && !this.multiple) {
            this.setSelected([]);
        }

        if (!this.resources || this.parentId !== parent) {
            this.setChildrenFor(parent);
            this.setBreadcrumbItemsFor(parent);
            this.parentId = parent;
            if (this.saveLastParentIdGlobal) {
                ResourcePickerStore.GLOBAL_PARENT_ID = parent;
            }
            this.onTraverse?.(parent);
        }
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
        return this._checkConditions({
            resource,
            requireClass: this.requireClass,
            requireInterface: this.requireInterface,
        });
    };

    refresh() {
        return this.setChildrenFor(this.parentId);
    }

    returnToInitial(): void {
        this.changeParentTo(this.initParentId);
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
            this._abortOperation(key as Action);
        });
    }

    @action
    setLoading(operation: Action, status: boolean) {
        this.loading = { ...this.loading, [operation]: status };
    }
    @action
    setError(operation: Action, msg?: string) {
        this.errors[operation] = msg;
    }

    private _abortOperation<T extends boolean = false>(
        operation: Action,
        reset?: T
    ): T extends true ? AbortController : undefined {
        if (this.abortControllers[operation]) {
            this.abortControllers[operation]!.abort();
        }
        const val = reset ? new AbortController() : undefined;
        this.abortControllers[operation] = val;
        return val as T extends true ? AbortController : undefined;
    }

    @action setParentItem(parentItem: CompositeRead | null) {
        this.parentItem = parentItem;
    }
    @action setParentId(id: number) {
        this.parentId = id;
    }

    @action setResources(resources: CompositeRead[]) {
        this.resources = resources;
    }

    @action
    async setBreadcrumbItems(items: CompositeRead[]): Promise<void> {
        this.breadcrumbItems = items;
    }

    @actionHandler
    async setBreadcrumbItemsFor(parent: number): Promise<void> {
        const abort = this._abortOperation("setBreadcrumbItemsFor", true);

        this.setBreadcrumbItems(
            await loadParents(parent, {
                signal: abort.signal,
            })
        );
    }

    @actionHandler
    async setChildrenFor(parent: number): Promise<void> {
        const abort = this._abortOperation("setChildrenFor", true);

        this.blueprint = await route("resource.blueprint").get({
            signal: abort.signal,
            cache: true,
        });
        this.setParentItem(
            await route("resource.item", parent).get({
                signal: abort.signal,
                cache: true,
            })
        );
        const resp = await route("resource.collection").get({
            query: { parent: parent },
            signal: abort.signal,
        });
        this.setResources(
            resp.filter((x: CompositeRead) => this._resourceVisible(x.resource))
        );
    }

    @actionHandler
    async createNewGroup(name: string): Promise<CompositeRead | undefined> {
        const abort = this._abortOperation("createNewGroup", true);

        const payload: CompositeCreate = {
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
        const newItem = this.resources?.find(
            (c) => c.resource.id === createdItem.id
        );

        if (newItem) {
            if (this.onNewGroup) {
                this.onNewGroup(newItem);
            }
            return newItem;
        }
    }

    @actionHandler
    async getSelectedParent({ selected }: ResourcePickerStoreOptions) {
        if (selected?.length) {
            this.setSelected(selected);
            const abort = this._abortOperation("getSelectedParent", true);
            const lastSelected = selected[selected.length - 1];
            const selectedItem = await route("resource.item", lastSelected).get(
                {
                    signal: abort.signal,
                    cache: true,
                }
            );
            this.setParentId(selectedItem.resource.parent?.id ?? this.parentId);
        }
        this.changeParentTo(this.parentId);
    }

    private _resourceVisible(resource: ResourceRead): boolean {
        return !this.hideUnavailable || this._resourceAvailable(resource);
    }

    private _resourceAvailable(resource: ResourceRead): boolean {
        return this._checkConditions({
            resource,
            requireClass: this.requireClass,
            requireInterface: this.requireInterface,
            traverseClasses: this.traverseClasses,
        });
    }

    private _checkConditions({
        resource,
        requireClass = [],
        requireInterface = [],
        traverseClasses,
    }: {
        resource: ResourceRead;
        requireClass?: ResourceCls[];
        requireInterface?: ResourceInterface[];
        traverseClasses?: ResourceCls[] | null;
    }): boolean {
        const { cls, interfaces } = resource;
        const checks: (() => boolean)[] = [];
        if (traverseClasses?.length) {
            checks.push(() =>
                this.getResourceClasses([cls]).some((cls) =>
                    traverseClasses.includes(cls)
                )
            );
        }
        if (requireClass.length) {
            checks.push(() =>
                this.getResourceClasses([cls]).some((cls) =>
                    requireClass.includes(cls)
                )
            );
        }
        if (requireInterface.length) {
            checks.push(() =>
                interfaces.some((intf) => requireInterface.includes(intf))
            );
        }
        return checks.length ? checks.some((c) => c()) : true;
    }
}
