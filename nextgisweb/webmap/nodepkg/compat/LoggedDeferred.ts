import Deferred from "dojo/Deferred";

export class LoggedDeferred extends Deferred {
    constructor(name: string) {
        super();
        this.then(
            () => {
                console.log("Deferred object [%s] resolved", name);
            },
            () => {
                console.error("Deferred object [%s] rejected", name);
            }
        );
    }
}
