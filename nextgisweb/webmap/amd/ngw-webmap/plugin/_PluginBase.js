define([
    "dojo/_base/declare"
], function (
    declare
) {
    return declare([], {
        constructor: function (options) {
            declare.safeMixin(this, options);
        },

        addToLayersMenu: function () {
            if (!this.display.layersPanel && !this.display.layersPanel.contentWidget.itemMenu) {
                return;
            }

            const menuItems = this.display.layersPanel.contentWidget.itemMenu.getChildren();
            const countMenuItems = menuItems.length;
            const currentOrder = this.menuItem.params.order;

            if (currentOrder === undefined || countMenuItems === 0) {
                this.display.layersPanel.contentWidget.itemMenu.addChild(this.menuItem, countMenuItems);
                return;
            }

            let insertIndex = countMenuItems;
            const itemsOrder = menuItems.map(i => {
                const params = i.params;
                return params.order || 0;
            });

            for (let i = 0; i < countMenuItems; i++) {
                const itemOrder = itemsOrder[i];
                if (i === 0 && countMenuItems === 1) {
                    insertIndex = currentOrder > itemOrder ? 1 : 0;
                    break;
                }
                if (i === 0 && itemsOrder[i] > currentOrder) {
                    insertIndex = 0;
                    break;
                } else if (i === 0) {
                    continue;
                }

                if (itemsOrder[i - 1] < currentOrder && itemsOrder[i] > currentOrder) {
                    insertIndex = i;
                    break;
                }
            }

            this.display.layersPanel.contentWidget.itemMenu.addChild(this.menuItem, insertIndex);
        },

        postCreate: function () {
        },

        startup: function () {
        }
    });
});
