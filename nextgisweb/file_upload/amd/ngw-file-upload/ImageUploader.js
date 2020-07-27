define([
    "dojo/_base/declare",
    'dojo/dom-class',
    "ngw-pyramid/i18n!file_upload",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./template/ImageUploader.hbs",
    './Uploader'
], function (
    declare,
    domClass,
    i18n,
    hbsI18n,
    template,
    Uploader,
) {
    /***
     * Use ImageUploader.get('value') to get image:
     *   object    - upload_meta
     *   null      - delete image
     *   undefined - no changes
     */
    return declare([Uploader], {
        _deleteImage: false,
        current_image: '',
        templateString: hbsI18n(template, i18n),

        startup: function () {
            this.inherited(arguments);

            this.setAccept('image/png');

            if (this.current_image !== '') {
                this._setBackgroundImage();
            } else {
                this.current_image = null;
            }

            this.btnDeleteImage.on('click', function () {
                this._deleteImage = true;

                this.current_image = null;
                this._setBackgroundImage();
            }.bind(this));
        },

        get: function(property) {
            if (property === 'value' && this._deleteImage) {
                return null;
            } else {
                return this.inherited(arguments);
            }
        },

        _setBackgroundImage: function () {
            if (this.current_image === null) {
                this.dropTarget.style.removeProperty('background');
                domClass.remove(this.domNode, 'has_image');
            } else {
                this.dropTarget.style.background = 'url(' + this.current_image + ') no-repeat';
                domClass.add(this.domNode, 'has_image');
            }
        },

        uploadBegin: function () {
            this.inherited(arguments);

            this._deleteImage = false;

            var files = this.uploaderWidget.inputNode.files;
            if (files.length === 1) {
                var reader = new FileReader();
                reader.onloadend = function () {
                    this.current_image = reader.result;
                    this._setBackgroundImage();
                }.bind(this);
                reader.readAsDataURL(files[0]);
            }
        }
    });
});
