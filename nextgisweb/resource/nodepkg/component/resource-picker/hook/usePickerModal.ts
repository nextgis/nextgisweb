import type { CardProps, ModalProps } from "@nextgisweb/gui/antd";

import type { UsePickerModalProps } from "../type";

const usePickerModal = ({
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
    const bodyStyle = cardOptions.styles?.body || defaultCardBodyStyle;
    cardOptions.styles = { ...cardOptions.styles, body: bodyStyle };
    cardOptions.style = cardOptions.style || defaultCardStyle;

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

    const cardProps = {
        ...cardOptions,
    };

    return { modalProps, cardProps };
};

export default usePickerModal;
