import { route as routeApi } from "@nextgisweb/pyramid/api";
import type {
    RequestOptions,
    RouteResults,
} from "@nextgisweb/pyramid/api/type";

import type { Attributes } from "./resource-attr";
import { attrsKey, normalize } from "./util";

type Waiter = {
    resolve: (values: unknown[]) => void;
    reject: (err: unknown) => void;
};

interface Batch {
    attrs: Attributes;
    resources: Set<number>;
    waiters: Map<number, Waiter[]>;
    timer?: ReturnType<typeof setTimeout>;
}

interface RouterAttrBatcerOptions {
    delay?: number;
    route?: RouteResults<"resource.attr">;
}

export class ResourceAttrBatcher {
    private batches = new Map<string, Batch>();

    private delay = 25;
    private route: RouteResults<"resource.attr">;

    constructor({ delay, route }: RouterAttrBatcerOptions = {}) {
        this.route = route ?? routeApi("resource.attr");
        if (delay !== undefined) {
            this.delay = delay;
        }
    }

    load(
        resourceId: number,
        attributes: Attributes,
        _opt?: Pick<RequestOptions, "signal">
    ) {
        const key = attrsKey(attributes);

        let batch = this.batches.get(key);
        if (!batch) {
            batch = {
                attrs: attributes,
                resources: new Set<number>(),
                waiters: new Map<number, Waiter[]>(),
            };
            this.batches.set(key, batch);
        }

        batch.resources.add(resourceId);

        return new Promise<unknown[]>((resolve, reject) => {
            const arr = batch.waiters.get(resourceId);
            if (arr) {
                arr.push({ resolve, reject });
            } else {
                batch.waiters.set(resourceId, [{ resolve, reject }]);
            }

            clearTimeout(batch.timer);

            batch.timer = setTimeout(() => {
                this.drain(key);
            }, this.delay);
        });
    }

    private async drain(key: string) {
        const batch = this.batches.get(key);
        if (!batch) return;

        this.batches.delete(key);

        clearTimeout(batch.timer);

        const resources = [...batch.resources];
        if (resources.length === 0) return;
        try {
            const { items } = await this.route.post({
                json: { resources, attributes: batch.attrs },
            });

            const byId = new Map<number, unknown[]>();
            for (const [id, raw] of items) {
                byId.set(id, normalize(raw));
            }

            for (const [id, waiters] of batch.waiters) {
                const values = byId.get(id) ?? batch.attrs.map(() => undefined);
                for (const w of waiters) {
                    w.resolve(values);
                }
            }
        } catch (err) {
            for (const waiters of batch.waiters.values()) {
                for (const w of waiters) {
                    w.reject(err);
                }
            }
        }
    }
}

export const resourceAttrBatcher = new ResourceAttrBatcher();
