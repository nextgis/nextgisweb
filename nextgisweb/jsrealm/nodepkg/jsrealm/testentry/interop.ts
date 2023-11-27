/** @testentry mocha */
import Deferred from "dojo/Deferred";
import { publish, subscribe } from "dojo/topic";

describe("Interoperability with Dojo", () => {
    it("dojo/Deferred", (done) => {
        const deferred = new Deferred();
        deferred.then(() => done());
        setTimeout(() => {
            deferred.resolve(undefined);
        }, 50);
    });

    it("dojo/topic", (done) => {
        subscribe("test", () => done());
        setTimeout(() => {
            publish("test", {});
        }, 50);
    });
});
