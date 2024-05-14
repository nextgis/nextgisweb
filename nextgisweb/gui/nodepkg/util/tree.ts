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
    let children: F[] = [];
    const relationFunction: RelationFunction<F> =
        typeof relation === "function"
            ? relation
            : (item): F[] => item[relation] as F[];
    const relChild = relationFunction(item);
    if (relChild) {
        if (Array.isArray(relChild)) {
            children = relChild;
        } else {
            children.push(relChild);
        }
    }
    return relChild ? children : undefined;
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
