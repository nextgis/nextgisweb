define([
    "dojo/_base/declare",
    "ngw-pyramid/i18n!file_upload",
    "ngw-pyramid/hbs-i18n",
    "dojo/text!./template/ImageUploader.hbs",
    './Uploader'
], function (
    declare,
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
        templateString: hbsI18n(template, i18n),

        startup: function () {
            this.inherited(arguments);

            this.setAccept('image/png');

            this.btnDeleteImage.on('click', function () {
                this._deleteImage = true;
                this.setImageUrl(null);
            }.bind(this));
        },

        get: function(property) {
            if (property === 'value' && this._deleteImage) {
                return null;
            } else {
                return this.inherited(arguments);
            }
        },

        setImageUrl: function (url) {
            if (url === null) {
                //delete this.dropTarget.style.background;
                this.dropTarget.style.removeProperty('background');
            } else {
                this.dropTarget.style.background = 'url(' + url + ') no-repeat';
            }
        },

        uploadBegin: function () {
            this.inherited(arguments);

            this._deleteImage = false;

            var files = this.uploaderWidget.inputNode.files;
            if (files.length === 1) {
                var reader = new FileReader();
                reader.onloadend = function () {
                    var image = reader.result;
                    this.setImageUrl(image);
                }.bind(this);
                reader.readAsDataURL(files[0]);
            }
        }
    });
});
