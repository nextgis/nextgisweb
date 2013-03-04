define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dijit/form/Button",
    "dijit/Tree",
    "dojo/store/Memory",
    "dojo/store/Observable",
    "dijit/tree/ObjectStoreModel",
    "dojo/request/xhr"
],
function (declare, array, Button, Tree, Memory, Observable, ObjectStoreModel, xhr) {
    return declare("layer.LayerTree", [Tree], {

        preamble: function () {
            this.store = new Observable(new Memory({
                data: [{
                    "xid": "layer_group-0",
                    "type": "layer_group",
                    "id": 0
                }],
                idProperty: "xid"
            }));
            this.store.getChildren = function (object) {
                return this.query({parent: object.xid});
            };

            this.model = new ObjectStoreModel({store: this.store, query: {"xid": "layer_group-0"}});

            // TODO: разобраться как модифицировать arguments
            this.showRoot = false;
            this.getLabel = function (item) { return item.display_name; };
            this.getIconClass = function(item, opened){
               return item.type == 'layer_group' ? (opened ? "dijitFolderOpened" : "dijitFolderClosed") : "dijitLeaf";
            };
        },

        postCreate: function () {
            this.inherited(arguments);

            var widget = this;

            xhr(application_url + "/api/layer_group/0/tree", {handleAs: "json"}).then(
                function (data) {
                    function traverse (item, parent_id) {
                        var xid = item.type + '-' + item.id;

                        // корень добавляется при создании дерева
                        if (parent_id) {
                            widget.store.add({
                                "xid": xid,
                                "type": "layer_group",
                                "id": item.id,
                                "parent": parent_id,
                                "display_name": item.display_name
                            });
                        };
                        
                        // подгруппы
                        array.forEach(item.children, function (i) {
                            traverse(i, xid);
                        });

                        // слои
                        array.forEach(item.layers, function (l) {
                            widget.store.add({
                                "xid": l.type + '-' + l.id,
                                "type": "layer",
                                "id": l.id,
                                "parent": xid,
                                "display_name": l.display_name
                            });

                            // стили
                            array.forEach(l.styles, function (s) {
                                widget.store.add({
                                    "xid": s.type + "-" + s.id,
                                    "type": "style",
                                    "id": s.id,
                                    "parent": l.type + '-' + l.id,
                                    "display_name": s.display_name,
                                    "layer_display_name": s.layer_display_name
                                });
                            })
                        });
                    };
                    traverse(data);

                },
                function (err) { console.log(err); }
            );
        }
    });
})