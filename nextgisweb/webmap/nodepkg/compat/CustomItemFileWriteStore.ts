import ItemFileWriteStore from "dojo/data/ItemFileWriteStore";

interface Item {
    [key: string]: any;
}

export class CustomItemFileWriteStore extends ItemFileWriteStore {
    dumpItem(item: Item | null): Record<string, any> {
        const obj: Record<string, any> = {};

        if (item) {
            const attributes = this.getAttributes(item);

            if (attributes.length > 0) {
                for (let i = 0; i < attributes.length; i++) {
                    const values = this.getValues(item, attributes[i]);

                    if (values) {
                        if (values.length > 1) {
                            obj[attributes[i]] = [];
                            for (let j = 0; j < values.length; j++) {
                                const value = values[j];

                                if (this.isItem(value)) {
                                    obj[attributes[i]].push(
                                        this.dumpItem(value)
                                    );
                                } else {
                                    obj[attributes[i]].push(value);
                                }
                            }
                        } else {
                            if (this.isItem(values[0])) {
                                obj[attributes[i]] = this.dumpItem(values[0]);
                            } else {
                                obj[attributes[i]] = values[0];
                            }
                        }
                    }
                }
            }
        }

        return obj;
    }
}
