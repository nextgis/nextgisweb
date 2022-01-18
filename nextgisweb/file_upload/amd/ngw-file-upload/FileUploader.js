define("ngw-file-upload/FileUploader", [
	"dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/window",
	"dojo/Deferred",
	"dojo/dom-style",
	"dojo/dom-class",
	"dojo/dom-geometry",
	"dojo/dom-attr",
	"dojo/dom-construct",
	"dojo/dom-form",
	"dojo/promise/all",
	"dojo/request/xhr",
	"dijit",
	"dijit/form/Button",
	"dojox/form/uploader/_Base",
	"dojox/form/uploader/_HTML5",
	"dojo/i18n!dojox/form/nls/Uploader",
	"dojo/text!dojox/form/resources/Uploader.html",
	"@nextgisweb/file-upload/tus-client",
	"ngw/route",
	"@nextgisweb/pyramid/settings!"
],function (
    kernel,
    declare,
    lang,
    array,
    connect,
    win,
    Deferred,
    domStyle,
    domClass,
    domGeometry,
    domAttr,
    domConstruct,
    domForm,
    all,
    xhr,
    dijit,
    Button,
    Base,
    HTML5,
    res,
    template,
    tus,
    route,
    settings
) {

	// TODO:
	//		i18n
	//		label via innerHTML
	//		Doc and or test what can be extended.
	//		Doc custom file events
	//		Use new FileReader() for thumbnails
	//		flashFieldName should default to Flash
	//		get('value'); and set warning
	//		Make it so URL can change (current set to Flash on build)
	//

	return declare("ngw-file-upload.FileUploader", [Base, Button, HTML5], {
		// summary:
		//		A widget that creates a stylable file-input button, with optional multi-file selection,
		//		using only HTML elements. Non-HTML5 browsers have fallback options of Flash or an iframe.
		//
		// description:
		//		A bare-bones, stylable file-input button, with optional multi-file selection. The list
		//		of files is not displayed, that is for you to handle by connecting to the onChange
		//		event, or use the dojox.form.uploader.FileList.
		//
		//		Uploader without plugins does not have any ability to upload - it is for use in forms
		//		where you handle the upload either by a standard POST or with Ajax using an iFrame. This
		//		class is for convenience of multiple files only. No progress events are available.
		//
		//		If the browser supports a file-input with the "multiple" attribute, that will be used.
		//		If the browser does not support "multiple" (ergo, IE) multiple inputs are used,
		//		one for each selection.
		//
		//		Version: 1.6
	
	
		// uploadOnSelect: Boolean
		//		If true, uploads immediately after a file has been selected. If false,
		//		waits for upload() to be called.
		uploadOnSelect:false,
	
		// tabIndex: Number|String
		//		The tab order in the DOM.
		tabIndex:0,
	
		// multiple: Boolean
		//		If true and flash mode, multiple files may be selected from the dialog.
		multiple:false,
	
		// label: String
		//		The text used in the button that when clicked, opens a system Browse Dialog.
		label:res.label,
	
		// url: String
		//		The url targeted for upload. An absolute URL is preferred. Relative URLs are
		//		changed to absolute.
		url:"",
	
		// name: String
		//		The name attribute needs to end with square brackets: [] as this is the standard way
		//		of handling an attribute "array". This requires a slightly different technique on the
		//		server.
		name:"uploadedfile",
	
		// flashFieldName: String
		//		If set, this will be the name of the field of the flash uploaded files that the server
		//		is expecting. If not set, "Flash" is appended to the "name" property.
		flashFieldName:"",
		
		//	force: String
		//		options: form, html5, iframe, flash
		//		Empty string defaults to html5 if available, and iframe if not.
		// 		Use "flash" to always use Flash (and hopefully force the user to download the plugin
		//		if they don't have it).
		//		Use "iframe" to always use an iframe, and never flash nor html5. Sometimes preferred
		//		for consistent results.
		//		Use "form" to not use ajax and post to a page.
		force:"",
	
		// uploadType: String [readonly]
		//		The type of uploader being used. As an alternative to determining the upload type on the
		//		server based on the fieldName, this property could be sent to the server to help
		//		determine what type of parsing should be used.
		//		This is set based on the force property and what features are available in the browser.
		uploadType:"",
	
		// showInput: String [const]
		//		Position to show an input which shows selected filename(s). Possible
		//		values are "before", "after", which specifies where the input should
		//		be placed with reference to the containerNode which contains the
		//		label). By default, this is empty string (no such input will be
		//		shown). Specify showInput="before" to mimic the look&feel of a
		//		native file input element.
		showInput: "",
		
		//	focusedClass: String
		//		The class applied to the button when it is focused (via TAB key)
		focusedClass:"dijitButtonHover",
	
		_nameIndex:0,
	
		templateString: template,
	
		baseClass: 'dijitUploader '+Button.prototype.baseClass,
	
		postMixInProperties: function(){
			this._inputs = [];
			this._cons = [];
			this.force = this.force.toLowerCase();
			if (settings.tus.enabled && tus.default.isSupported) {
				this.upload = this._tusUpload;
			}else if(this.supports("multiple")){
				this.uploadType = this.force === 'form' ? 'form' : 'html5';
			}else{
				this.onError('This uploader is not supported by your browser!')
			}

			this.inherited(arguments);
		},
		buildRendering: function(){
			this.inherited(arguments);
			domStyle.set(this.domNode, {
				overflow:"hidden",
				position:"relative"
			});
			this._buildDisplay();
			//change the button node not occupy tabIndex: the real file input
			//will have tabIndex set
			domAttr.set(this.titleNode, 'tabIndex', -1);
		},
		_buildDisplay: function(){
			if(this.showInput){
				this.displayInput = domConstruct.create('input', {
						'class':'dijitUploadDisplayInput',
						'tabIndex':-1, 'autocomplete':'off',
						'role':'presentation'},
					this.containerNode, this.showInput);
				//schedule the attachpoint to be cleaned up on destroy
				this._attachPoints.push('displayInput');
				this.connect(this,'onChange', function(files){
					var i=0,l=files.length, f, r=[];
					while((f=files[i++])){
						if(f && f.name){
							r.push(f.name);
						}
					}
					this.displayInput.value = r.join(', ');
				});
				this.connect(this,'reset', function(){
					this.displayInput.value = '';
				});
			}
		},
	
		startup: function(){
			if(this._buildInitialized){
				return;
			}
			this._buildInitialized = true;
			this._getButtonStyle(this.domNode);
			this._setButtonStyle();
			this.inProgress = false;
			this.inherited(arguments);
		},
	
		/*************************
		 *	   Public Events	 *
			*************************/
	
		onChange: function(/*Array*/ fileArray){
			// summary:
			//		stub to connect
			//		Fires when files are selected
			//		Event is an array of last files selected
		},
	
		onBegin: function(/*Array*/ dataArray){
			this.inProgress = true;
			// summary:
			//		Fires when upload begins
		},
	
		onProgress: function(/*Object*/ customEvent){
			// summary:
			//		Stub to connect
			//		Fires on upload progress. Event is a normalized object of common properties
			//		from HTML5 uploaders and the Flash uploader. Will not fire for IFrame.
			// customEvent:
			//		- bytesLoaded: Number:
			//			Amount of bytes uploaded so far of entire payload (all files)
			//		- bytesTotal: Number:
			//			Amount of bytes of entire payload (all files)
			//		- type: String:
			//			Type of event (progress or load)
			//		- timeStamp: Number:
			//			Timestamp of when event occurred
		},
	
		onComplete: function(/*Object*/ customEvent){
			this.inProgress = false;
			// summary:
			//		stub to connect
			//		Fires when all files have uploaded
			//		Event is an array of all files
			this.reset();
		},
	
		onCancel: function(){
			this.inProgress = false;
			// summary:
			//		Stub to connect
			//		Fires when dialog box has been closed
			//		without a file selection
		},
	
		onAbort: function(){
			this.inProgress = false;
			// summary:
			//		Stub to connect
			//		Fires when upload in progress was canceled
		},
	
		onError: function(/*Object or String*/ evtObject){
			this.inProgress = false;
			// summary:
			//		Fires on errors
	
			// FIXME: Unsure of a standard form of error events
		},
	
		/*************************
		 *	   Public Methods	 *
			*************************/
	
		upload: function(/*Object?*/ formData){				
			// summary:
			//		When called, begins file upload. Only supported with plugins.
			formData = formData || {};
			formData.uploadType = this.uploadType;
			this.inherited(arguments);
		},
	
		submit: function(/*form Node?*/ form){
			// summary:
			//		If Uploader is in a form, and other data should be sent along with the files, use
			//		this instead of form submit.
			form = !!form ? form.tagName ? form : this.getForm() : this.getForm();
			var data = domForm.toObject(form);
			data.uploadType = this.uploadType;
			this.upload(data);
		},
	
		reset: function(){
			// summary:
			//		Resets entire input, clearing all files.
			//		NOTE:
			//		Removing individual files is not yet supported, because the HTML5 uploaders can't
			//		be edited.
			//		TODO:
			//		Add this ability by effectively, not uploading them
			//
			delete this._files;
			this._disconnectButton();
			array.forEach(this._inputs, domConstruct.destroy);
			this._inputs = [];
			this._nameIndex = 0;
			this._createInput();
		},
	
		getFileList: function(){
			// summary:
			//		Returns a list of selected files.
	
			var fileArray = [];
			if(this.supports("multiple")){
				array.forEach(this._files, function(f, i){
					fileArray.push({
						index:i,
						name:f.name,
						size:f.size,
						type:f.type
					});
				}, this);
			}else{
				array.forEach(this._inputs, function(n, i){
					if(n.value){
						fileArray.push({
							index:i,
							name:n.value.substring(n.value.lastIndexOf("\\")+1),
							size:0,
							type:n.value.substring(n.value.lastIndexOf(".")+1)
						});
					}
				}, this);
	
			}
			return fileArray; // Array
		},
	
		/*********************************************
		 *	   Private Property. Get off my lawn.	 *
			*********************************************/
	
		_getValueAttr: function(){
			// summary:
			//		Internal. To get disabled use: uploader.get("disabled");
			return this.getFileList();
		},
	
		_setValueAttr: function(disabled){
			console.error("Uploader value is read only");
		},
	
		_setDisabledAttr: function(disabled){
			// summary:
			//		Internal. To set disabled use: uploader.set("disabled", true);
			if(this.disabled == disabled || !this.inputNode){ return; }
			this.inherited(arguments);
			domStyle.set(this.inputNode, "display", disabled ? "none" : "");
		},
	
		_getButtonStyle: function(node){
			this.btnSize = {w:domStyle.get(node,'width'), h:domStyle.get(node,'height')};
		},
	
		_setButtonStyle: function(){
			this.inputNodeFontSize = Math.max(2, Math.max(Math.ceil(this.btnSize.w / 60), Math.ceil(this.btnSize.h / 15)));
			this._createInput();
		},
	
		_getFileFieldName: function(){
			var name;
			if(this.supports("multiple") && this.multiple){
				name = this.name+"s[]";
			}else{
				// <=IE8
				name = this.name + (this.multiple ? this._nameIndex : "");
			}
			return name;
		},
	
		_createInput: function(){
			if(this._inputs.length){
				domStyle.set(this.inputNode, {
					top:"500px"
				});
				this._disconnectButton();
				this._nameIndex++;
			}
			var name = this._getFileFieldName();
			// reset focusNode to the inputNode, so when the button is clicked,
			// the focus is properly moved to the input element
			this.focusNode = this.inputNode = domConstruct.create("input", {type:"file", name:name, "aria-labelledby":this.id+"_label"}, this.domNode, "first");
			if(this.supports("multiple") && this.multiple){
				domAttr.set(this.inputNode, "multiple", true);
			}
			this._inputs.push(this.inputNode);
	
			domStyle.set(this.inputNode, {
				position:"absolute",
				fontSize:this.inputNodeFontSize+"em",
				top:"-3px",
				right:"-3px",
				opacity:0
			});
			this._connectButton();
		},
	
		_connectButton: function(){
			this._cons.push(connect.connect(this.inputNode, "change", this, function(evt){
				this._files = this.inputNode.files;
				this.onChange(this.getFileList(evt));
				if(!this.supports("multiple") && this.multiple) this._createInput();
			}));
	
			if(this.tabIndex > -1){
				this.inputNode.tabIndex = this.tabIndex;
	
				this._cons.push(connect.connect(this.inputNode, "focus", this, function(){
					domClass.add(this.domNode, this.focusedClass);
				}));
				this._cons.push(connect.connect(this.inputNode, "blur", this, function(){
					domClass.remove(this.domNode, this.focusedClass);
				}));
			}
		},
	
		_disconnectButton: function(){
			array.forEach(this._cons, connect.disconnect);
			this._cons.splice(0,this._cons.length);
		},

		_tusUpload: function(){
			var self = this;

			var uploaders = [];

			var total = 0;
			var progress = [];
			function uploadedTotal () {
				return progress.reduce(function(acc, val) { return acc + val; });
			}

			for (var i = 0; i < this._files.length; i++) {
				var file = this._files[i];

				total += file.size;
				progress.push(0);

				var deferred = new Deferred();

				var uploader = new tus.default.Upload(file, {
					endpoint: route.file_upload.collection(),
					storeFingerprintForResuming: false,
					chunkSize: settings.tus.chunk_size.default,
					metadata: { name: file.name },
					__number: i,
					__deferred: deferred,
	
					onProgress: function (bytesUploaded, bytesTotal) {
						progress[this.__number] = bytesUploaded;

						var decimal = uploadedTotal() / total;
						self.onProgress({
							type:"progress",
							decimal: decimal,
							percent: (100 * decimal).toFixed(0) + "%",
						});
					},

					onError: function (error) {
						var response = error.originalResponse;
						if (response.getHeader('Content-Type') === 'application/json') {
							error = JSON.parse(response.getBody());
						}
						this.__deferred.reject(error);
					},
	
					onSuccess: function () {
						xhr.get(uploaders[this.__number].url, {handleAs: 'json'}).then(
							this.__deferred.resolve,
							this.__deferred.reject
						)
					}
				});

				uploaders.push(uploader);
			};

			all(uploaders.map(function (uploader) {
				return uploader.options.__deferred.promise;
			})).then(function (data) {
				self.onComplete({ upload_meta: data });
			}).catch(function (error){
				self.onError(error);
			});

			this.onBegin();

			uploaders.forEach(function (uploader) {
				uploader.start();
			})
		}
	});

});
