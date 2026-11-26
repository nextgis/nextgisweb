import { Modal as AntdModal, Grid } from "antd";
import type { ModalProps as AntdModalProps } from "antd";
import classNames from "classnames";

export interface ModalProps extends AntdModalProps {
  fullscreenOnMobile?: boolean;
}

export function Modal({ fullscreenOnMobile = false, ...props }: ModalProps) {
  const screens = Grid.useBreakpoint();
  const fullscreen = fullscreenOnMobile && screens.md === false;
  if (!fullscreen) {
    return <AntdModal {...props} />;
  }

  const { style, styles } = props;

  return (
    <AntdModal
      {...props}
      className={classNames(props.className, "ngw-modal-fullscreen")}
      centered={false}
      width="100%"
      height="100dvh"
      style={{
        ...style,
        top: 0,
        margin: 0,
        paddingBottom: 0,
        minWidth: 0,
        maxWidth: "100%",
        minHeight: 0,
        maxHeight: "none",
      }}
      styles={(info) => {
        const custom = typeof styles === "function" ? styles(info) : styles;
        return {
          ...custom,
          container: {
            ...custom?.container,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            borderRadius: 0,
          },
          body: {
            ...custom?.body,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            height: "auto",
            minHeight: 0,
            maxHeight: "none",
            overflowY: "auto",
          },
        };
      }}
    />
  );
}

Modal.useModal = AntdModal.useModal;
Modal.confirm = AntdModal.confirm;
Modal.info = AntdModal.info;
Modal.success = AntdModal.success;
Modal.error = AntdModal.error;
Modal.warning = AntdModal.warning;
Modal.destroyAll = AntdModal.destroyAll;
Modal.config = AntdModal.config;

export default Modal;
