/** @testentry react */
import { BaseError } from "@nextgisweb/jsrealm/error";
import { ServerResponseError } from "@nextgisweb/pyramid/api";

import { Button, Space } from "../antd";
import { useShowModal } from "../show-modal/useShowModal";

import { errorModal } from ".";

class CustomError extends BaseError {}

export default function ErrorTestentry() {
    const { modalHolder, modalStore } = useShowModal();

    return (
        <>
            {modalHolder}
            <Space.Compact>
                <Button
                    onClick={() => {
                        try {
                            throw new Error("Error message");
                        } catch (err) {
                            errorModal(err, { modalStore });
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
                            errorModal(err, { modalStore });
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
                            errorModal(err, { modalStore });
                        }
                    }}
                >
                    ServerResponseError
                </Button>
                <Button
                    onClick={() => {
                        errorModal(
                            {
                                message: "Error message",
                                title: "Error title",
                            },
                            { modalStore }
                        );
                    }}
                >
                    Object
                </Button>
            </Space.Compact>
        </>
    );
}
