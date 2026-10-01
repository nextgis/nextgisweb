import { actionBound, observableShallow } from "mobx";
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
  @observableShallow accessor modalItems: ModalItem[] = [];

  has(id: string) {
    return this.modalItems.find((item) => item.id === id);
  }

  @actionBound
  add(modalItem: ModalItem) {
    this.modalItems = [...this.modalItems, modalItem];
  }

  @actionBound
  update(id: string, element: ReactNode) {
    const modalItems = [...this.modalItems];
    const modalItem = modalItems.find((e) => e.id === id);
    if (modalItem) {
      modalItem.element = element;
    }
    this.modalItems = modalItems;
  }

  @actionBound
  remove(id: string) {
    this.modalItems = this.modalItems.filter((e) => e.id !== id);
  }
  @actionBound
  clean() {
    this.modalItems = [];
  }
}
