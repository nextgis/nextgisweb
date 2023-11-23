import { route } from "@nextgisweb/pyramid/api";
import type { ResourceItem } from "@nextgisweb/resource/type/Resource";

const parseName = (name: string): [string, number] => {
    const match = name.match(/^(.*)\((\d+)\)$/);
    return match ? [match[1].trim(), parseInt(match[2], 10)] : [name, 0];
};

const isSameBaseName = (baseName: string, otherName: string): boolean => {
    return baseName.trim() === otherName.trim();
};

export async function getUniqueName({
    signal,
    parentId,
    defaultName,
}: {
    signal?: AbortSignal;
    parentId: number;
    defaultName: string;
}): Promise<string> {
    const siblings = await route("resource.collection").get<ResourceItem[]>({
        signal,
        query: { parent: parentId },
    });

    const [baseName, initialNumber] = parseName(defaultName);
    let highestNumber = initialNumber;

    for (const sibling of siblings) {
        const [siblingBaseName, siblingNumber] = parseName(
            sibling.resource.display_name
        );
        if (isSameBaseName(baseName, siblingBaseName)) {
            highestNumber = Math.max(highestNumber, siblingNumber);
        }
    }

    if (
        highestNumber > initialNumber ||
        siblings.some((s) => s.resource.display_name === defaultName)
    ) {
        return `${baseName} (${highestNumber + 1})`;
    }
    return defaultName;
}
