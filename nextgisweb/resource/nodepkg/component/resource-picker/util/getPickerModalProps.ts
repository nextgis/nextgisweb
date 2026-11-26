import type { CardProps, ModalProps } from "@nextgisweb/gui/antd";

import type { UsePickerModalProps } from "../type";

const getPickerModalProps = ({
  cardOptions = {},
  height = 600,
  cardTitleHeight = 58,
  cardFooterHeight = 58,
}: UsePickerModalProps) => {
  const cardHeight = height - cardTitleHeight - cardFooterHeight;

  const modalDefaultProps: ModalProps = {
    centered: true,
    width: "50em",
    transitionName: "",
    maskTransitionName: "",
  };

  const defaultCardStyle: CardProps["style"] = {
    width: "100%",
    height,
    boxSizing: "border-box",
  };

  const defaultCardBodyStyle = {
    height: cardHeight,
    overflow: "auto",
  };
  const styles = cardOptions.styles;

  const bodyStyle =
    styles && "body" in styles ? styles.body : defaultCardBodyStyle;

  const modalProps: ModalProps = {
    ...modalDefaultProps,
    styles: {
      body: {
        height,
        overflowY: "auto",
        padding: "0",
      },
    },
  };

  const cardProps: CardProps = {
    ...cardOptions,
    style: {
      ...(cardOptions.style || defaultCardStyle),
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: 0,
    },
    styles: {
      ...cardOptions.styles,
      body: { ...bodyStyle, flex: "1 1 auto", minHeight: 0 },
    },
  };

  return { modalProps, cardProps };
};

export default getPickerModalProps;
