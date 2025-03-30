/** @testentry react */
import { Button, Space } from "@nextgisweb/gui/antd";
import { makeAbortError } from "@nextgisweb/gui/error/util";
import { BaseError } from "@nextgisweb/jsrealm/error";

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
                    ngwEntry("missing");
                }}
            >
                EntrypointError
            </Button>
            <Button
                onClick={() => {
                    throw makeAbortError("Test abort error");
                }}
            >
                AbortError
            </Button>
        </Space.Compact>
    );
}
