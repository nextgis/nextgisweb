import { action, observable, runInAction } from "mobx";

import type { ErrorInfo } from "@nextgisweb/gui/error/extractError";
import { route } from "@nextgisweb/pyramid/api";
import type { RequestOptions } from "@nextgisweb/pyramid/api/type";
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
    | "selectChildren"
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
    @observable.shallow accessor allLoadedResources: Map<
        number,
        CompositeRead
    > = new Map();
    @observable.ref accessor parentId: number = 0;
    @observable.shallow accessor breadcrumbItems: CompositeRead[] = [];
    @observable.ref accessor hideUnavailable = false;
    @observable.shallow accessor disableResourceIds: number[] = [];
    @observable.shallow accessor requireClass: ResourceCls[] = [];
    @observable.shallow accessor requireInterface: ResourceInterface[] = [];
    @observable.ref accessor allowSelection = true;
    @observable.ref accessor allowMoveInside = true;
    @observable.shallow accessor traverseClasses: ResourceCls[] | null = null;
    @observable.ref accessor allowCreateResource = true;
    @observable.shallow accessor selected: number[] = [];
    @observable.ref accessor multiple = false;
    @observable.ref accessor saveLastParentIdGlobal = false;
    @observable.ref accessor getThisMsg = msgPickThis;
    @observable.ref accessor getSelectedMsg = msgPickSelected;
    @observable.shallow accessor errors: Partial<Record<Action, ErrorInfo>> =
        {};
    @observable.shallow accessor loading: Partial<Record<Action, boolean>> = {};

    @observable.shallow accessor selectedParentsRegistry: Map<
        number,
        { children: number[]; loading?: boolean }
    > = new Map();
    @observable.shallow accessor loadingParentsChildren: Set<number> =
        new Set();

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

    @actionHandler
    async setSelected(selected: number[]): Promise<void> {
        const newSelected = this.selected.filter((id) =>
            this.disableResourceIds.includes(id)
        );
        for (const s of selected) {
            if (!newSelected.includes(s)) {
                newSelected.push(s);
            }
        }
        runInAction(() => {
            this.selected = newSelected;
        });

        if (this.multiple) {
            this.updateSelectedParentsRegistry();
        }
    }

    @action
    setLoadingParentsChildren(registry: Set<number>) {
        this.loadingParentsChildren = registry;
    }

    @actionHandler
    async selectFirstChildren(parentId: number) {
        this.selectChildren(parentId, (resources) =>
            resources.length ? [resources[0].resource.id] : []
        );
    }

    async selectAllChildren(parentId: number) {
        this.selectChildren(parentId, (resources) =>
            resources.map((item) => item.resource.id)
        );
    }

    @actionHandler
    async selectChildren(
        parentId: number,
        getNewSelectedIds: (resource: CompositeRead[]) => number[]
    ) {
        if (this.multiple && !this.loadingParentsChildren.has(parentId)) {
            try {
                const registry = new Set(this.loadingParentsChildren);
                registry.add(parentId);
                this.setLoadingParentsChildren(registry);

                const abort = this._abortOperation("selectChildren", true);

                const response = await this.fetchChildrenResources(parentId, {
                    signal: abort.signal,
                });
                const childrenResources = response.filter(
                    (child) =>
                        this.checkEnabled(child.resource) &&
                        !this.disableResourceIds.includes(child.resource.id)
                );

                if (!this.resources || this.resources.length === 0) {
                    return;
                }
                if (childrenResources.length) {
                    const newSelected = new Set<number>([
                        ...this.selected,
                        ...getNewSelectedIds(childrenResources),
                    ]);

                    this.setSelected(Array.from(newSelected));
                }
            } finally {
                const registry = new Set(this.loadingParentsChildren);
                registry.delete(parentId);
                this.setLoadingParentsChildren(registry);
            }
        }
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
    setError(operation: Action, msg?: ErrorInfo) {
        this.errors[operation] = msg;
    }

    private _abortOperation<T extends boolean = false>(
        operation: Action,
        reset?: T
    ): T extends true ? AbortController : undefined {
        if (this.abortControllers[operation]) {
            this.abortControllers[operation]?.abort();
        }
        const val = reset ? new AbortController() : undefined;
        this.abortControllers[operation] = val;
        return val as T extends true ? AbortController : undefined;
    }

    @action
    setParentItem(parentItem: CompositeRead | null) {
        this.parentItem = parentItem;
    }
    @action
    setParentId(id: number) {
        this.parentId = id;
    }

    @action
    setResources(resources: CompositeRead[]) {
        this.resources = resources;

        this.updateLoadedResources(resources);
    }

    @action
    updateLoadedResources(resources: CompositeRead[]) {
        const allResources = new Map(this.allLoadedResources);
        resources.forEach((resource) => {
            allResources.set(resource.resource.id, resource);
        });
        this.allLoadedResources = allResources;
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
                cache: true,
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
        const childrenResources = await this.fetchChildrenResources(parent, {
            signal: abort.signal,
        });
        this.setResources(childrenResources);
    }

    private async fetchChildrenResources(
        parent: number,
        { signal }: RequestOptions = {}
    ) {
        const resp = await route("resource.collection").get({
            query: { parent: parent },
            signal,
        });
        this.updateLoadedResources(resp);
        return resp.filter((x: CompositeRead) =>
            this._resourceVisible(x.resource)
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

    private async updateSelectedParentsRegistry(): Promise<void> {
        const registry = new Map<number, { children: number[] }>();

        for (const selectedId of this.selected) {
            const parentsChain: CompositeRead[] = await loadParents(
                selectedId,
                { cache: true }
            );
            for (const parentItem of parentsChain) {
                const parentId = parentItem.resource.id;
                if (parentId !== selectedId) {
                    if (!registry.has(parentId)) {
                        registry.set(parentId, {
                            children: [],
                        });
                    }
                    const entry = registry.get(parentId)!;

                    if (!entry.children.some((id) => id === selectedId)) {
                        entry.children.push(selectedId);
                    }
                }
            }
        }
        runInAction(() => {
            this.selectedParentsRegistry = registry;
        });
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
