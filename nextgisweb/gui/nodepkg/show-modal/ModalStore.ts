import { action, observable } from "mobx";
import type { ReactNode } from "react";

export interface MenuItem {
    className?: string;
    href?: string;
    title?: ReactNode;
    notification?: string;
}

export interface ModalItem {
    id: string;
    element: ReactNode;
}

export class ModalStore {
    @observable.shallow accessor modalItems: ModalItem[] = [];

    @action.bound
    add(modalItem: ModalItem) {
        this.modalItems = [...this.modalItems, modalItem];
    }

    @action.bound
    update(id: string, element: React.ReactNode) {
        const modalItems = [...this.modalItems];
        const modalItem = modalItems.find((e) => e.id === id);
        if (modalItem) {
            modalItem.element = element;
        }
        this.modalItems = modalItems;
    }

    @action.bound
    remove(id: string) {
        this.modalItems = this.modalItems.filter((e) => e.id !== id);
    }
    @action.bound
    clean() {
        this.modalItems = [];
    }
}
