import { get, set } from "lodash-es";
import {
    action,
    computed,
    isObservableProp,
    observable,
    reaction,
    runInAction,
} from "mobx";

import {
    BaseAPIError,
    LunkwillParam,
    request,
    route,
    routeURL,
} from "@nextgisweb/pyramid/api";
import type { RequestOptions } from "@nextgisweb/pyramid/api/type";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    CompositeCreate,
    CompositeRead,
    CompositeUpdate,
    ResourceCls,
    ResourceRefWithParent,
    ResourceWidget,
} from "@nextgisweb/resource/type/api";

import type { EditorStore, EditorStoreOptions, EditorWidget } from "../type";

import type { CompositeWidgetProps } from "./CompositeWidget";

interface WidgetEntrypoint<S extends EditorStore = EditorStore> {
    store: new (args: EditorStoreOptions) => S;
    widget: EditorWidget<S>;
}

export interface WidgetMember<S extends EditorStore = EditorStore> {
    key: string;
    store: S;
    widget: EditorWidget<S>;
}

export class CompositeStore {
    @observable accessor operation: ResourceWidget["operation"];
    @observable accessor cls: ResourceCls | null = null;
    @observable accessor parent: number | null = null;

    @observable accessor id: number | null = null;
    @observable accessor owner_user: number | null = null;
    /** Suggested resource display name from cls options */
    @observable accessor sdnBase: string | null = null;

    @observable.shallow accessor config: Record<string, unknown> | null = null;

    @observable accessor validate = false;

    @observable accessor membersLoading = false;
    @observable.shallow accessor members: WidgetMember[] | null = null;
    @observable accessor saving = false;

    constructor({ id, cls, operation, parent }: CompositeWidgetProps) {
        this.operation = operation;
        if (parent !== undefined) {
            this.parent = parent;
        }
        if (cls) {
            this.cls = cls;
        }
        if (id !== undefined) {
            this.id = id;
        }
    }

    async init() {
        const { config, cls, id, parent, owner_user, suggested_display_name } =
            await route("resource.widget").get({
                query: {
                    id: this.id ?? undefined,
                    cls: this.cls ?? undefined,
                    operation: this.operation,
                    parent: this.parent ?? undefined,
                },
            });
        this.setConfig(config);
        runInAction(() => {
            this.cls = cls;
            this.id = id;
            this.parent = parent;
            this.owner_user = owner_user;
            this.sdnBase = suggested_display_name;
        });

        reaction(
            () => this.members,
            () => {
                if (this.operation === "read" || this.operation === "update") {
                    this.refresh();
                }
            }
        );
    }

    @action
    setMembers(members: WidgetMember[]) {
        this.members = members;
    }

    @action
    setConfig(config: ResourceWidget["config"]) {
        this.config = config;
        this.loadMembers(config);
    }

    @action
    setSaving(status: boolean) {
        this.saving = status;
    }

    /** Suggested resource display name from file name or other aspects */
    @computed
    get sdnDynamic(): string | undefined {
        const firstMemberWithSdn = this.members?.find(
            (member) => member.store.suggestedDisplayName
        );
        if (firstMemberWithSdn) {
            return firstMemberWithSdn.store.suggestedDisplayName;
        }
        return undefined;
    }

    @action
    setValidate(status: boolean) {
        this.validate = status;
    }

    @computed
    get dirty(): boolean {
        if (!this.members) {
            return false;
        } else {
            return this.members.some(({ store }) =>
                store.dirty !== undefined ? store.dirty : false
            );
        }
    }

    @computed
    get isValid(): boolean {
        if (!this.validate) return true;
        return this.members?.every((member) => member.store.isValid) ?? true;
    }

    async dump(
        lunkwill: LunkwillParam
    ): Promise<CompositeCreate | CompositeUpdate> {
        if (!this.members) {
            throw new Error("The Store is not loaded yet");
        }

        const data: CompositeCreate | CompositeUpdate = { resource: {} };

        if (this.operation === "create") {
            if (this.cls) {
                (data as CompositeCreate).resource.cls = this.cls;
            }

            if (this.parent !== null) {
                (data as CompositeCreate).resource.parent = { id: this.parent };
            }
        }

        for (const member of this.members) {
            const identity = member.store.identity;
            if (identity) {
                const result = await member.store.dump({ lunkwill });
                if (result !== undefined) {
                    const current = get(data, identity);
                    set(
                        data,
                        identity,
                        current !== undefined
                            ? Object.assign(current, result)
                            : result
                    );
                }
            }
        }
        return data;
    }

    load(data: CompositeRead): void {
        if (this.members) {
            for (const member of this.members) {
                const identity = member.store.identity;
                member.store.load(get(data, identity));
            }
        }
    }

    async create(): Promise<ResourceRefWithParent | undefined> {
        return this.storeRequest({
            url: routeURL("resource.collection"),
            method: "POST",
        });
    }

    async update(): Promise<ResourceRefWithParent | undefined> {
        if (this.id !== null) {
            return this.storeRequest({
                url: routeURL("resource.item", { id: this.id }),
                method: "PUT",
            });
        }
    }

    private async refresh(): Promise<void> {
        if (this.id !== null) {
            const item = await route("resource.item", {
                id: this.id,
            }).get();
            this.load(item);
        }
    }

    private async loadMembers(config: ResourceWidget["config"]) {
        const members = await Promise.all(
            Object.entries(config).map(async ([moduleName, params]) => {
                const member = await ngwEntry<WidgetEntrypoint>(moduleName);

                const widgetStore = new member.store({
                    composite: this,
                    operation: this.operation,
                    ...params,
                });

                if (!isObservableProp(widgetStore, "dirty")) {
                    console.warn(
                        `Missing 'dirty' observable in '${moduleName}' store!`
                    );
                }

                return { ...member, key: moduleName, store: widgetStore };
            })
        );

        this.setMembers(members);
    }

    private async storeRequest({
        url,
        method,
    }: { url: string } & RequestOptions): Promise<
        ResourceRefWithParent | undefined
    > {
        this.setValidate(true);
        if (!this.isValid) {
            // TODO: Refactor user errors
            throw new BaseAPIError(
                // prettier-ignore
                gettext("Errors found during data validation. Tabs with errors marked in red."),
                { title: gettext("Validation error") }
            );
        }

        this.setSaving(true);
        try {
            const lunkwill = new LunkwillParam();
            const data = await this.dump(lunkwill);

            const response = (await request(url, {
                method,
                json: data,
                lunkwill,
            })) as ResourceRefWithParent;

            return response;
        } finally {
            this.setSaving(false);
        }
    }
}
