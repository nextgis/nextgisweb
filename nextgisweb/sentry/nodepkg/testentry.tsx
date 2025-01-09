/** @testentry react */
import { BaseError } from "make-error";

import { Button, Space } from "@nextgisweb/gui/antd";

class CustomError extends BaseError {}

export default function Testentry() {
    return (
        <Space.Compact>
            <Button
                onClick={() => {
                    throw new Error("Hello, Sentry!");
                }}
            >
                Hello, Sentry!
            </Button>
            <Button
                onClick={() => {
                    throw new CustomError("Custom error message");
                }}
            >
                CustomException
            </Button>
            <Button
                onClick={() => {
                    // @ts-expect-error If forbids the second argument somehow
                    window.require(["missing"], function () {});
                }}
            >
                DojoLoaderError
            </Button>
        </Space.Compact>
    );
}
