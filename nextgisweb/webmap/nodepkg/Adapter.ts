export interface AdapterOptions {
    [key: string]: any;
}

export class Adapter {
    constructor(options: AdapterOptions = {}) {
        Object.assign(this, options);
    }
}
