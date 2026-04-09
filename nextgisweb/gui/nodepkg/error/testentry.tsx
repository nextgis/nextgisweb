/** @testentry react */
import * as falso from "@ngneat/falso";

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
              throw new Error(falso.randPhrase());
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
              throw new CustomError(falso.randPhrase());
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
                title: falso.randShape() + " error",
                message: falso.randPhrase(),
                detail: falso.randParagraph(),
                contact: falso.rand(["support", "administrator"]),
                status_code: 418,
                exception: "nextgisweb.teapot.TestException",
                request_id: "deadbeef",
                data: { foo: "bar", baz: "qux" },
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
                title: falso.randAdjective() + " error",
                message: falso.randPhrase(),
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
