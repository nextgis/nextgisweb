/** @testentry react */
import { BaseError } from "@nextgisweb/jsrealm/error";
import { ServerResponseError } from "@nextgisweb/pyramid/api";

import { Button, Space } from "../antd";

import { errorModal } from ".";

class CustomError extends BaseError {}

export default function ErrorTestentry() {
    return (
        <Space.Compact>
            <Button
                onClick={() => {
                    try {
                        throw new Error("Error message");
                    } catch (err) {
                        errorModal(err);
                    }
                }}
            >
                Error
            </Button>
            <Button
                onClick={() => {
                    try {
                        throw new CustomError("Error message");
                    } catch (err) {
                        errorModal(err);
                    }
                }}
            >
                CustomError
            </Button>
            <Button
                onClick={() => {
                    try {
                        throw new ServerResponseError({
                            message: "Error message",
                            title: "Error title",
                            detail: "Error detail",
                            status_code: 418,
                        });
                    } catch (err) {
                        errorModal(err);
                    }
                }}
            >
                ServerResponseError
            </Button>
            <Button
                onClick={() => {
                    errorModal({
                        message: "Error message",
                        title: "Error title",
                    });
                }}
            >
                Object
            </Button>
        </Space.Compact>
    );
}
