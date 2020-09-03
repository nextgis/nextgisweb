define([
    "dojo/_base/declare",
    'dojo/dom-class',
    "ngw-pyramid/i18n!file_upload",
    "ngw-pyramid/hbs-i18n",
    'ngw-pyramid/NGWButton/NGWButton',
    "dojo/text!./template/ImageUploader.hbs",
    './Uploader',
    //
    "xstyle/css!./resource/ImageUploader.css",
], function (
    declare,
    domClass,
    i18n,
    hbsI18n,
    NGWButton,
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
        current_image: null,
        templateString: hbsI18n(template, i18n),
        backgroundSize: 'contain', // 'auto', 'cover',

        postCreate: function () {
            this.inherited(arguments);
            domClass.add(this.focusNode, `uploader--${this.backgroundSize}`);
        },

        startup: function () {
            this.inherited(arguments);

            this.setAccept('image/png');

            this.btnDeleteImage.on('click', function () {
                this._deleteImage = true;
                this.uploadReset();
            }.bind(this));

            this.dropTarget.addEventListener('drop', function(e){
              var dt = e.dataTransfer;
              var files = dt.files;
              if (files.length === 1) {
                  this.readImage(files[0]);
              }
            }.bind(this));
        },

        get: function(property) {
            if (property === 'value' && this._deleteImage) {
                return null;
            } else {
                return this.inherited(arguments);
            }
        },

        readImage(file) {
            var reader = new FileReader();
            reader.onloadend = function () {
                this.current_image = reader.result;
            }.bind(this);
            reader.readAsDataURL(file);
        },

        setImage: function (url) {
            this.current_image = url;
            if (this.current_image) {
                domClass.add(this.focusNode, 'uploader--complete');
            }
            this._setBackgroundImage();
        },

        _setBackgroundImage: function () {
            if (this.current_image) {
                this.dropTarget.style.backgroundImage = 'url(' + this.current_image + ')';
            } else {
                this.dropTarget.style.removeProperty('background-image');                
            }
        },

        uploadBegin: function () {
            this.inherited(arguments);

            this.uploadReset();
            this._deleteImage = false;

            var files = this.uploaderWidget.inputNode.files;
            if (files.length) {
                this.readImage(files[0]);
            }
        },

        uploadComplete: function() {
            this.inherited(arguments);
            this._setBackgroundImage(this.current_image);
        },

        uploadReset: function() {
            this.inherited(arguments);
            this.current_image = null;
            this._setBackgroundImage();
        }
    });
});
