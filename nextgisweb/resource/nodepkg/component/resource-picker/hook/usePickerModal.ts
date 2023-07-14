import type { Card, Modal } from "@nextgisweb/gui/antd";

type CardProps = Parameters<typeof Card>[0];
type ModalProps = Parameters<typeof Modal>[0];

interface UsePickerModalProps {
    cardOptions: CardProps;
    height: number;
    cardTitleHeight?: number;
    cardFooterHeight?: number;
}

const usePickerModal = ({
    cardOptions = {},
    height,
    cardTitleHeight = 58,
    cardFooterHeight = 58,
}: UsePickerModalProps) => {

    const cardHeight = height - cardTitleHeight - cardFooterHeight;

    const modalDefaultProps: ModalProps = {
        centered: true,
        width: "40em",
        transitionName: "",
        maskTransitionName: "",
    };

    const defaultCardStyle: CardProps['style'] = {
        width: "100%",
        height,
        boxSizing: 'border-box'
    };

    const defaultCardBodyStyle = {
        height: cardHeight,
        overflow: "auto",
    };

    cardOptions.bodyStyle = cardOptions.bodyStyle || defaultCardBodyStyle;
    cardOptions.style = cardOptions.style || defaultCardStyle;

    const modalProps: ModalProps = {
        ...modalDefaultProps,
        bodyStyle: {
            height,
            overflowY: "auto",
            padding: "0",
        },
    };

    const cardProps = {
        ...cardOptions,
    };

    return { modalProps, cardProps };
};

export default usePickerModal;
