export type DefaultTreeItem = Record<any, any>;

type D = DefaultTreeItem;

export type RelationFunction<T extends D = D> = (x: T) => T | T[] | undefined;
export type CompareFunction<T extends D> = (x: T) => boolean;
export type TreeRelation<T extends D = D> = RelationFunction<T> | keyof T;

export interface TreeOptions<T extends D = D> {
    relation?: TreeRelation<T>;
}

export function getChildren<F extends D = D>(
    item: F,
    relation: TreeRelation<F> = "children"
): F[] | undefined {
    const relationFunction: RelationFunction<F> =
        typeof relation === "function"
            ? relation
            : (item): F[] => item[relation] as F[];

    const relChild = relationFunction(item);
    if (!relChild) {
        return undefined;
    }

    return Array.isArray(relChild) ? relChild : [relChild];
}

export function getParent<F extends D = D>(
    items: F[],
    compare: CompareFunction<F>,
    relation: TreeRelation<F> = "children"
): F | undefined {
    for (const item of items) {
        const children = getChildren(item, relation);
        if (children) {
            if (children.some((ch) => compare(ch))) {
                return item;
            } else {
                const foundParent = getParent(children, compare, relation);
                if (foundParent) return foundParent;
            }
        }
    }
    return undefined;
}

export function getChildrenDeep<F extends D = D>(
    item: F,
    relation: TreeRelation<F> = "children"
): F[] {
    const collectChildren = (node: F, accumulator: F[]): void => {
        const children = getChildren(node, relation);
        if (children) {
            children.forEach((child) => {
                accumulator.push(child);
                collectChildren(child, accumulator);
            });
        }
    };

    const allChildren: F[] = [];
    collectChildren(item, allChildren);
    return allChildren;
}

export function traverseTree<F extends D = D>(
    items: F[],
    callback: (item: F, index: number, arr: F[]) => boolean | void,
    relation: TreeRelation<F> = "children"
): boolean {
    return items.some((item, index, arr) => {
        if (callback(item, index, arr) === true) {
            return true;
        }
        const children = getChildren(item, relation);
        if (children) {
            return traverseTree(children, callback, relation);
        }
    });
}

export function countNodes<F extends D = D>(
    items: F[],
    relation: TreeRelation<F> = "children"
): number {
    let count = 0;
    traverseTree(
        items,
        () => {
            count++;
        },
        relation
    );
    return count;
}

export function findNode<F extends D = D>(
    items: F[],
    compare: CompareFunction<F>,
    relation: TreeRelation<F> = "children"
): F | undefined {
    for (const item of items) {
        if (compare(item)) {
            return item;
        }
        const children = getChildren(item, relation);
        if (children) {
            const found = findNode(children, compare, relation);
            if (found) {
                return found;
            }
        }
    }
    return undefined;
}
