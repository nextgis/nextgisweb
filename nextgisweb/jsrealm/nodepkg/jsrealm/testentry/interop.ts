/* eslint-disable @typescript-eslint/ban-ts-comment */
/** @testentry mocha */
// @ts-ignore
import Deferred from "dojo/Deferred";
// @ts-ignore
import { publish, subscribe } from "dojo/topic";

describe("Interoperability with Dojo", () => {
    it("dojo/Deferred", (done) => {
        const deferred = new Deferred();
        deferred.then(() => done());
        setTimeout(() => deferred.resolve(), 50);
    });

    it("dojo/topic", (done) => {
        subscribe("test", () => done());
        setTimeout(() => publish("test"), 50);
    });
});
