export class LunkwillParam {
    static VALUES = [null, "suggest", "require"];

    private value: string | null;

    constructor() {
        this.value = LunkwillParam.VALUES[0];
    }

    update(value: string | null, cond = true) {
        if (!cond) {
            return;
        }

        const index = LunkwillParam.VALUES.indexOf(value);
        if (index < 0) {
            throw `Invalid lunkwill option value: ${value}`;
        }

        if (index > LunkwillParam.VALUES.indexOf(this.value)) {
            this.value = value;
        }
    }

    suggest(cond = true) {
        this.update("suggest", cond);
    }
    require(cond = true) {
        this.update("require", cond);
    }

    toHeaders(headers: Record<string, string>) {
        if (this.value !== null) {
            headers["X-Lunkwill"] = this.value;
        }
    }
}
