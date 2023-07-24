export class AbortControllerHelper {
    private _controllers: AbortController[] = [];

    constructor() {
        this._controllers = [];
    }

    makeSignal() {
        const controller = new AbortController();
        this._controllers.push(controller);
        return controller.signal;
    }

    abort() {
        for (const controller of this._controllers) {
            controller.abort();
        }
        this._controllers = [];
    }

    get empty() {
        return this._controllers.length === 0;
    }
}
