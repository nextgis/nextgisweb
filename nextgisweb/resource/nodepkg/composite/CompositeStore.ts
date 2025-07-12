import { get, set } from "lodash-es";
import { action, computed, observable, runInAction } from "mobx";

import { extractError } from "@nextgisweb/gui/error";
import type { ErrorInfo } from "@nextgisweb/gui/error/extractError";
import { BaseError, assert } from "@nextgisweb/jsrealm/error";
import { BaseAPIError, LunkwillParam, route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    CompositeCreate,
    CompositeMembersConfig,
    CompositeRead,
    CompositeUpdate,
    CompositeWidgetOperation,
    ResourceCls,
    ResourceRef,
} from "@nextgisweb/resource/type/api";

import type { EditorStore, EditorStoreOptions, EditorWidget } from "../type";

export type CompositeSetup =
    | { operation: "create"; cls: ResourceCls; parent: number }
    | { operation: "update"; id: number };

class CompositeUninitialized extends BaseError {}

interface WidgetEntrypoint<S extends EditorStore = EditorStore> {
    store: new (args: EditorStoreOptions) => S;
    widget: EditorWidget<S>;
}

export interface WidgetMember<S extends EditorStore = EditorStore> {
    key: string;
    store: S;
    widget: EditorWidget<S>;
}

export interface CompositeStoreOptions {
    setup: CompositeSetup;
}

export class CompositeStore {
    readonly setup: CompositeSetup;
    readonly operation: CompositeWidgetOperation;
    readonly resourceId: number | null;

    // The following private properties are set in CompositeStore.init and
    // accessed via corresponding getters with initialization guards.
    #cls: ResourceCls | undefined = undefined;
    #parent: number | null | undefined = undefined;
    #ownerUser: number | undefined = undefined;
    #sdnBase: string | null | undefined = undefined;
    #initialValue: CompositeRead | null | undefined = undefined;

    @observable.ref accessor validate = false;
    @observable.ref accessor members: WidgetMember[] | undefined = undefined;
    @observable.ref accessor loading = true;
    @observable.ref accessor saving = false;
    @observable.shallow accessor error: ErrorInfo | null = null;

    constructor({ setup: request }: CompositeStoreOptions) {
        this.setup = request;
        this.operation = request.operation;
        this.resourceId = request.operation === "update" ? request.id : null;
    }

    async init() {
        try {
            const data = await route("resource.widget").get({
                query: this.setup,
            });
            runInAction(() => {
                this.#cls = data.cls;
                this.#parent = data.parent;
                this.#ownerUser = data.owner_user;
                this.#sdnBase =
                    data.operation === "create"
                        ? data.suggested_display_name
                        : null;
            });
            this.loadMembers(data.members);
        } catch (er) {
            runInAction(() => {
                this.loading = false;
                this.error = extractError(er);
            });
        }
    }

    private initializationGuard<T>(value: T) {
        if (value === undefined) throw new CompositeUninitialized();
        return value;
    }

    get cls() {
        return this.initializationGuard(this.#cls);
    }

    get parent() {
        return this.initializationGuard(this.#parent);
    }

    get ownerUser() {
        return this.initializationGuard(this.#ownerUser);
    }

    get sdnBase() {
        return this.initializationGuard(this.#sdnBase);
    }
    get initialValue() {
        return this.initializationGuard(this.#initialValue);
    }

    @action
    setSaving(value: boolean) {
        this.saving = value;
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
    setValidate(value: boolean) {
        this.validate = value;
        this.initializationGuard(this.members).forEach(({ store }) => {
            if (store.validate !== undefined) {
                store.validate = value;
            }
        });
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
        const data: CompositeCreate | CompositeUpdate = {};
        for (const member of this.initializationGuard(this.members)) {
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

    private async refresh(): Promise<void> {
        if (this.resourceId === null) throw new Error();

        const item = await route("resource.item", {
            id: this.resourceId,
        }).get();

        runInAction(() => {
            this.#initialValue = item;
        });

        for (const member of this.initializationGuard(this.members)) {
            const identity = member.store.identity;
            member.store.load(get(item, identity));
        }
    }

    private async loadMembers(value: CompositeMembersConfig) {
        const members = await Promise.all(
            Object.entries(value).map(async ([moduleName, params]) => {
                const member = await ngwEntry<WidgetEntrypoint>(moduleName);

                const widgetStore = new member.store({
                    composite: this,
                    operation: this.operation,
                    ...params,
                });

                return { ...member, key: moduleName, store: widgetStore };
            })
        );

        runInAction(() => {
            this.members = members;
        });

        if (this.operation === "update") {
            await this.refresh();
        }

        runInAction(() => {
            this.loading = false;
        });
    }

    async submit(): Promise<ResourceRef> {
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
            if (this.operation === "create") {
                return (await route("resource.collection").post({
                    json: data as Extract<typeof data, CompositeCreate>,
                    lunkwill,
                })) as ResourceRef;
            } else if (this.operation === "update") {
                await route("resource.item", { id: this.resourceId! }).put({
                    json: data as Extract<typeof data, CompositeUpdate>,
                    lunkwill,
                });
                return { id: this.resourceId! };
            } else assert(false);
        } finally {
            this.setSaving(false);
        }
    }
}
