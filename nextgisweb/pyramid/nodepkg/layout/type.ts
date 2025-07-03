import type { Modal, message } from "@nextgisweb/gui/antd";

type ModalHookResult = ReturnType<typeof Modal.useModal>;
type MessageHookResult = ReturnType<typeof message.useMessage>;

export type ModalAPI = ModalHookResult[0];
export type MessageAPI = MessageHookResult[0];
