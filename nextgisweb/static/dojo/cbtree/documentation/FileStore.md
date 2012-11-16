# The File Store #

The cbtree File Store implements an in-memory store whose content represent the file 
system layout of the HTTP back-end server document root directory or portions thereof.
The File Store consist of two components, the dojo client side application *FileStore.js*
and the HTTP back-end server aplication *cbtreeFileStore.php* or *cbtreeFileStore.cgi*
and is dynamically loaded by issueing HTTP GET requests to the back-end server
serving the active HTML page.

Please note that the HTTP GET, DELETE and POST methods are supported but only GET is enabled 
by default. See the Server Side Application [configuration](#server-side-configuration) for
details.

#### Lazy Store Loading ####

The cbtree File Store fully supports the concept of *Lazy Loading* which is the process 
of loading back-end information ondemand, or in other words: only load what and when needed.
Depending on the store model used with the File Store the user can influence this behavior.
For example, if the File Store is used with the cbtree FileStoreModel, the 
[model properties](StoreModels.md#store-model-properties) *deferItemLoadingUntilExpand*
and *checkedStrict* actually determine how data is retrieved from the back-end server.

If you elect to use a store model that requires a full store load (no lazy loading), such
as the FileStoreModel with the model property *checkedStrict* set, please check the '*Which
Application to use*' section of the [Server Side Applications](#server-side-applications) as 
performance may be an issue.


<h2 id="file-store-requirements">File Store Requirements</h2>

In order for the cbtree File Store to function properly your back-end server 
must host at least one of the server side applications included in the cbtree package:

* cbtreeFileStore.php
* cbtreeFileStore.cgi

See the [Server Side Application](#server-side-application) section for details on how to 
select and configure the correct application for your environment and possible additional
requirements. The PHP implementation has been fully tested with PHP 5.3.1

#### File Store Restrictions ####

File Store (client side) use the JavaScript XHR API to communicate with the back-end
server therefore cross-domain access is, by default, denied. If you need to retrieve file
system information from any server other than the one hosting the active HTML
page you must configure a so-called HTTP proxy server. (**HTTP server configuration is beyond the
scope of this document**).

The content of the in-memory File Store in treated as read-only, as a result, you can not change
file properties such as the name or path using *setValue()*. To rename a file use *rename()* instead. 
You can however use the setValue() or setValues() methods to add custom attribute/properties to
items in the store which will be writeable.
For example, the CheckBox Tree FileStoreModel adds a property called 'checked' to each item 
in the store. Custom attributes/properties are not stored on the back-end server, as soon as
you application terminates the custom attributes, and their values, are lost. 

<h2 id="server-side-applications">Server Side Applications</h2>

The cbtree File Store comes with two implementations of the cbtree Server Side Application,
one written in PHP the other is an ANSI-C CGI application compliant with the 
[CGI Version 1.1](http://datatracker.ietf.org/doc/rfc3875/) specification. Your HTTP 
server must host at least one of them. The following sections describe how to select the 
appropriate Server Side Application for your environment, the server requirements and 
optionally how to configure the application environment.

#### Which Application to use ####

Both applications offer the same functionality but they operates in a different HTTP 
back-end server environment each with its own requirements.  
The primary selection criteria are:

1. What application environment does your server support? PHP, CGI or both.
2. Is a complete (initial) store load required by you application?
3. The size of the file system you want to expose.

If your server only support PHP or CGI but not both the choice is simple. If, on the other hand, 
both are supported and your application requires a full store load, that is, load all available
information up-front like with the TreeStoreModel that has strict parent-child relationship enabled, 
than the last question will determine the final outcome. If you operate on a large file system with
10,000+ files it is highly recommended you use the ANSI-C CGI implementation.

Most scripting languages such as PHP are implemented as an interpreter and therefore slower than
any native compiled code like the ANSI-C CGI application. As an example, loading the entire store
running both the browser application and the PHP server side aplication on the same 4 core 2.4 Mhz AMD
processor with a file system of 21,000 files takes about 6-7 seconds. Running the exact same browser
application on the same platform but with the CGI application takes 3-4 seconds.

If your application does ***NOT*** require a full store load (lazy loading is sufficient) and none
of the directories served by the Server Side Application has hundreds of file entries you probably
won't notice much of a difference as only a relatively small amounts of processing power is
required to serve each client request.

#### cbtreeFileStore.php ####

If you are planning on using the PHP implementation, your HTTP server must provide PHP support and have the
PHP JSON feature set enabled. The actual location of the server application on your back-end
server is irrelevant as long as it can be access using a formal URL. See the usage of the 
store property *baseURL* and the environment variable CBTREE_BASEPATH for more details.

#### cbtreeFileStore.cgi ####

The ANSI-C CGI application needs to be compiled for the target Operating System. 
Currently a Microsoft Windows implementation and associated Visual Studio 2008 project
is included in the cbtree package.
If you need the CGI application for another OS please refer to the inline documentation
of the *cbtree_NP.c* module for details. Module *cbtree_NP.c* is the only source module
that contains Operating System specific code.

The location to install the CGI application depends on the HTTP server configuration.
On Apache HTTP servers the application is typically installed in the /cgi-bin directory which,
if configurred properly, is outside your document root.
For Apache users, please refer to the [CGI configuration](http://httpd.apache.org/docs/2.2/howto/cgi.html)
instructions for details.

#### Write your own application ####

If, for whatever reason, you have to or want to write your own server side application use 
the source code of the PHP and ANSI-C implementation as a functional guideline.
Below you'll find the ABNF notation for the server request and response.

##### Request: #####

    HTTP-GET       ::= uri ('?' query-string)?
    query-string  ::= (qs-param ('&' qs-param)*)?
    qs-param      ::= basePath | path | query | queryOptions | options | 
                      start | count | sort
    authToken      ::= 'authToken' '=' json-object
    basePath      ::= 'basePath' '=' path-rfc3986
    path          ::= 'path' '=' path-rfc3986
    query          ::= 'query' '=' json-object
    query-options ::= 'queryOptions' '=' json-object
    options          ::= 'options' '=' json-array
    start          ::= 'start' '=' number
    count          ::= 'count' '=' number
    sort           ::= 'sort' '=' json-array

##### Response: #####

    response      ::= '{' (totals ',')? (status ',')? (identifier ',')? (label ',')? file-list '}'
    totals           ::= '"total"' ':' number
    status          ::= '"status"' ':' status-code
    status-code      ::=    '200' | '204' | '401'
    identifier      ::= '"identifier"' ':' quoted-string
    label          ::= '"label"' ':' quoted-string
    file-list      ::= '"items"' ':' '[' file-info* ']'
    file-info      ::= '{' name ',' path ',' size ',' modified (',' icon)? ',' directory 
                        (',' children ',' expanded)? '}'
    name          ::= '"name"' ':' json-string
    path          ::= '"path"' ':' json-string
    size          ::= '"size"' ':' number
    modified      ::= '"modified"' ':' number
    icon          ::= '"icon"' ':' classname-string
    directory      ::= '"directory"' ':' ('true' | 'false')
    children      ::= '[' file-info* ']'
    expanded      ::= '"_EX"' ':' ('true' | 'false')
    quoted-string ::= '"' CHAR* '"'
    number          ::= DIGIT+
    DIGIT          ::= '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

Please refer to [http://json.org/](http://json.org/) for the proper JSON encoding rules.


<h2 id="server-side-configuration">Server Side Configuration</h2>

The Server Side Application utilizes two optional environment variables to control which HTTP request
types to support and to set a system wide basepath for the application:

CBTREE_BASEPATH

> The basePath is a URI reference (rfc 3986) relative to the server's document root used to
> compose the root directory.  If this variable is set it overwrites the basePath parameter
> in any HTTP query string and therefore becomes the server wide basepath.

    CBTREE_BASEPATH /system/wide/path

> Given the above basepath and if the document root of your server is /MyServer/htdocs the root
> directory for the Server Side Application becomes: */MyServer/htdocs/system/wide/path*

CBTREE_METHODS

> A comma separated list of HTTP methods to be supported by the Server Side Application. 
> By default only HTTP GET is supported. Possible options are uppercase GET, DELETE and POST. Example:

    CBTREE_METHODS GET,DELETE,POST

> If only HTTP GET support is required there is no need to define CBTREE_METHODS, if however, 
> HTTP DELETE and/or POST support is required you ***MUST*** define the CBTREE_METHODS variable.
> HTTP POST is required to rename files.

#### IMPORTANT ####

Some HTTP servers require  special configuration to make environment variables available to
script or CGI application.  For example, the Apache HTTP server requires you to either use
the *SetEnv* or *PassEnv* directive. To make environment variable CBTREE_METHODS
available add the following to your httpd.conf file:

    SetEnv CBTREE_METHODS GET,DELETE

                or

    PassEnv CBTREE_METHODS

Please refer to the Apache [mod_env](http://httpd.apache.org/docs/2.2/mod/mod_env.html) section
for additional details.

Whenever you set or change the value of the environment variables you ***MUST*** restart you HTTP
server to make these values available to scripts and CGI applications.


<h2 id="file-store-security">File Store Security</h2>

As with any application exposed to the Internet there are security issues you need to consider.
Both the PHP and CGI Server Side Application perform strict parameter checking in that any malformed
parameter is rejected, not just skipped, resulting in a HTTP 400 (Bad Request) error response. Any attempt to access
files outside the root directory results in a HTTP 403 (Forbidden) response.

By default only HTTP GET requests are excepted, if you want to support HTTP DELETE and/or POST you ***MUST***
set the server side environment variable CBTREE_METHODS. See [Server Side Configuration](#server-side-configuration)
for details. When HTTP POST is enabled only renaming files is supported, you cannot upload/modify files or other content.

#### Authentication ####

The Server Side Applications ***DO NOT*** perform any authentication. The client side can however pass
a so-called authentication token allowing you to implement you own authentication if needed.

#### File Access Restrictions ####

Neither Server Side Application will process any HTTP server directives. Any file and/or 
directory access restrictions in files like .htaccess are ignored by the Server Side Application. 
However, such file access restrictions will still be enforced by the HTTP server when users try to
access the files and/or directories directly. It is therefore highly recommended to put those types
of restrictions in place anyway as part of standard your security procedures.

If you have to rely on the HTTP server security, any HTTP request must be evaluated ***BEFORE***
the Server Side Application is invoked.
In addition do not rely on Operating System specific access privilages as PHP may not recognize
such features. For example, PHP does not recognize the Micorsoft Windows *hidden* file attribute.
In general, only expose files and directories that are intended for public consumption.
(See also *Hiding Files*)

#### Hiding Files ####

The Server Side Applications will recognize any file whose name starts with a dot(.) as a 'hidden' file
and exclude such files from being included in a response unless the *showHiddenFiles* option of the
File Store is set. In general, it is good pratice not to include any files you may consider private, 
hidden or not, in any directory you expose to the outside world.

***NOTE:*** Only the Windwos CGI implementation will also recognize the Microsoft Windows hidden file attribute. 

<h2 id="file-store-properties">File Store Properties</h2>

This section describes the properties of the cbtree File Store which can be passed as
arguments to the File Store constructor.

#### authToken: ####
> Object (null). An arbitrary JavaScript object which is passed to the back-end server with each XHR call.
> The File Store client does not put any restrictions on the content of the object.

#### basePath: ####
> String ("."), The basePath property is a URI reference (rfc 3986) relative to the
> server's document root and used by the server side application to compose the root 
> directory, as a result the root directory is defined as:
>
> root-dir ::= document-root '/' basepath
>
> *NOTE:* If the environment variable CBTREE_BASEPATH is set on the HTTP server this
> property is ignored.

#### cache: ####
> Boolean (false)

#### clearOnClose: ####
> Boolean (false), ClearOnClose allows the users to specify if a close call should force
> a reload or not. If set true, the store will be reset to default state.  Note that by doing
> this, all item handles will become invalid and a new fetch must be issued. Care should be
> taken when multiple models operate on the same store.

#### failOk: ####
> Boolean (false), Specifies if it is OK for the XHR calls to fail silently. If false
> an error is output on the console when the call fails.

#### options: ####
> String[] ([]). A comma separated string of keywords or an array of keyword strings. 
> The list of options is passed to the back-end server. The following
> keywords are supported by both Server Side Applications:
> #### iconClass ####
> Include the css classname for files and directories in the response. See *Fancy Tree Styling* 
> below.
> #### showHiddenFiles ####
> Include hidden files in the response. (see *Hidden Files* above).

#### url: ####
> String (""), The public URL of the Server Side Application serving the File Store.  
> For example: **http://MyServer/cgi-bin/cbtreeFileStore.cgi**

<h2 id="querying-the-store">Querying the Store</h2>

#### The Query Argument ####
Several store operations provide support for a *query* attribute as part of the *keywordArgs*
parameter. The query attribute is a JavaScript 'name:value' pairs type object. 
The value can be any data type that is allowed in a JavaScript conditional
test. By default, string values or interpreted as simple pattern strings which will be converted
 into regular expressions. If however, the string value is enclosed in brackets the outer most
 brackets are removed and the remainder is treated as a literal regular expression. 

For example, in the following query: {name:"ab\*"}, the pattern string "ab\*" translates into the
regular expression: /^ab.\*$/  
Other pattern string conversion samples are:

<table border="1">
  <thead>
      <th style="width:150px;">Pattern</th> <th style="width:200px;">Regular Expression</th>
  </thead>
  <tbody>
      <tr> <td>*ab*</td> <td>/^.*ab.*$/</td> </tr>
      <tr> <td>*a\*b*</td> <td>/^.*a\*b.*$/</td> </tr>
      <tr> <td>*a\*b?*</td> <td>/^.*a\*b..*$/</td> </tr>
  </tbody>
</table>

In case of a query like: {path:(^\\.\\/ab[^\\/]\*$)}, the path value (^\\.\\/ab[^\\/]\*$) will be 
treated as a literal regular expression: /^\\.\\/ab[^\\/]\*$/ and no convertion is applied.

#### The Query Options ####
In addition to the query argument you can specify query options as part of the *keywordArgs* parameter.
The options influence both the behavour of the Server Side Application and the File Store itself.

<table border="1">
  <thead>
      <th style="width:15%;">Option</th> <th style="width:auto;">Description</th>
  </thead>
  <tbody>
    <tr> 
      <td style="vertical-align:top">deep</td> 
      <td>
        If <strong>true</strong>, forces the File Store to perform a deep search including all 
        available items in the search. If query option <i>storeOnly</i> is false all items
        relative to the path property in <i>keywordArgs</i> will be fetched from the back-end server.
        if query option <i>deep</i> is <strong>false</strong> only the immediate children of the 
        base path are included in the search. (the content of the root directory)
      </td>
    </tr>
    <tr> 
      <td style="vertical-align:top">ignoreCase</td> 
      <td>
        If <strong>true</strong>, any regular expression will match strings case insensitive.
      </td> 
    </tr>
    <tr>
      <td style="vertical-align:top">storeOnly</td>
      <td>
        If <strong>true</strong>, limits the search to items currently loaded in the in memory store 
        otherwise, depending on the other <i>keywordArgs</i> parameters, data may be fetched from the back-end
        server before the actual search is executed.
      </td>
    </tr>
  </tbody>
</table>

<h2 id="fancy-tree-styling">Fancy Tree Styling</h2>

The File Store supports the option *iconClass* which will force it to include a CSS icon
classname for each store item (file). The classname is based on the file extension. 
If the *iconClass* option is set, the file store will generate a css classname which is
formatted as follows:

    iconClassname ::= 'fileIcon' fileExtension WSP 'fileIcon'

As a result each store item will have an addition attribute/property called *icon* 
whose value is a pair of camelCase classnames. The first character of fileExtension
is always uppercase, all other characters are lowercase like in *fileIconXml*. 
The only exception is a file system directory which gets the classname *fileIconDIR* to 
distinguesh between, although not common, a file with the extension '.dir'.  

The first classname is followed by a whitespace and the generic classname "fileIcon". The generic classname is used
as a fallback in case you don't have a CSS definition for the classname with the file extension. Therefore
always make sure you at least have a CSS definition for "fileIcon".

### Predefined Icons ###
The CheckBox Tree package comes with two sets of predefined icons and associated CSS definitions. One set
is based on the Apache HTTP server 'Fancy Index' icons the other is a set of Microsoft Windows explorer 
icons. The css definitions for these icon sets must be loaded explicitly, load either
*cbtree/icons/fileIconsApache.css* ***OR*** *cbtree/icons/fileIconsMS.css* but ***NOT BOTH***.

    <link rel="stylesheet" href="/js/dojotoolkit/cbtree/icons/fileIconsMS.css" />

The icon sprites and CCS definitions included in the package serve as an example only, they certainly do
not cover all possible file extensions. Also the File Store only looks at the file extension when
generating the classname and does not look at the files content type.

### Prerequisites ###
To enable and use the Fancy Tree Styling in your applications the following requirements must be met:

* The Tree Styling extension must have been loaded. (cbtree/TreeStyling)
* A set of icons or an icon sprite must be available.
* A CSS definitions file must be available and loaded.
* The FileStoreModel and optionally the tree must be configured for icon support.

At the end of this document you can find a complete example of an application using the *Fancy Tree Styling*.

<h2 id="file-store-functions">File Store Functions</h2>

*********************************************
#### close( request ) ####
> Close out the store and reset the store to its initial state depending on the store
> property *clearOnClose*. If *clearOnClose* if false no action is taken.

*request:* (not used)

*********************************************
#### containsValue( item, attribute, value ) ####
> Returns true if the given attribute of item contains value.

*item:* store.item
> A valid file.store item.

*attribute:* String
> The name of an item attribute/property whose value is test.

*value:* AnyType
> The value to search for.
*********************************************
#### deleteItem( storeItem, onBegin, onComplete, onError, scope ) #### 
> Delete a store item. Note: Support for this function must be enabled explicitly
>  (See the [CBTREE_METHODS](#server-side-configuration) environment variable for details).

*storeItem:* data.item
> A valid dojo.data.store item.

*onBegin:* Function (Optional)
> If the onBegin callback function is provided, the callback function will be
> called once, before the XHR DELETE request is issued. The onBegin callback
> MUST return true in order to proceed with the deletion, any other return
> value will abort the operation. The onBegin callback if called without any
> arguments: *onBegin()*

*onComplete:* Function (Optional)
> If an onComplete callback function is provided, the callback function will be
> called once on successful completion of the delete operation with the list of
> deleted file store items: *onComplete(deletedItems)*

*onError:* Function (Optional)
> The onError parameter is the callback to invoke when the item load encountered
> an error. It takes two parameter, the error object and, if available, the HTTP
> status code: *onError(error, status)*

*scope:*  Object (Optional)
> If a scope object is provided, all of the callback functions (onBegin, onError, etc)
> will be invoked in the context of the scope object. In the body of the callback
> function, the value of the "this" keyword will be the scope object otherwise
> window.global is used.

*********************************************
#### fetch( keywordArgs ) ####
> Given a query and set of defined options, such as a start and count of items
> to return, this method executes the query and makes the results available as
> data items. The format and expectations of stores is that they operate in a
> generally asynchronous manner, therefore callbacks are always used to return
> items located by the fetch parameters.

*keywordArgs:* Object
> The keywordArgs parameter may either be an instance of conforming to dojo.data.api.Request
> or may be a simple anonymous object. (See dojo.data.api.Read.fetch for details).

*********************************************
#### fetchChildren( keywordArgs ) ####
> Given an item, this method returns the children of the item through the keywordArgs onItem 
> and/or onComplete callbacks.

*keywordArgs:* Object
> An anonymous object that defines the item to locate and callbacks to invoke when the
> item has been located and load has completed. The format of the object is as follows:  

> { *item*: item, *onItem*: Function, *onComplete*: Function, *onError*: Function, *scope*: Object }  

> (See dojo.data.api.Read.fetch for additional details).

*********************************************
#### fetchItemByIdentity( keywordArgs ) ####
> Given the identity of an item, this method returns the item that has that identity through
> the keywordArgs onItem callback.

*keywordArgs:* Object
> An anonymous object that defines the item to locate and callbacks to invoke when the
> item has been located and load has completed. The format of the object is as follows:
  
> { *identity*: string|object, *onItem*: Function, *onError*: Function, *scope*: Object }  

> (See dojo.data.api.Identity.fetchItemByIdentity for additional details).

*********************************************
#### getAttributes( item ) ####
> Returns an array of strings containing all available attributes. All private store
> attributes are excluded. Please note that of all attributes only custom attributes
> will be writeable.

*item:* store.item
> A valid file.store item.

*********************************************
#### getDirectory( item ) ####
> Returns the directory path of a store item.

*item:* store.item
> A valid file.store item.

*********************************************
#### getFeatures() ####
> The getFeatures() method returns an simple JavaScript "keyword:value" object that specifies
> what interface features the datastore implements.

*********************************************
#### getIdentity( item ) ####
> Returns a unique identifier for an item. The default identifier for the File Store 
> is the attribute *path* unless otherwise specified by the back-end server. The return
> value will be either a string or something that has a toString() method.

*item:* store.item
> A valid file.store item.

#### getIdentityAttributes( item ) ####
> Returns an array of attribute names that holds an items identity. By default, the File Store
> only supports one attribute: *path*.

*item:* store.item
> A valid file.store item.

*********************************************
#### getLabel( item ) ####
> Inspect the item and return a user-readable 'label' for the item that provides
> a general/adequate description of what the item is. By default the *name* 
> property of the item is used unless otherwise specified by the back-end server.

*item:* store.item
> A valid file.store item.

*********************************************
#### getLabelAttributes( item ) ####
> Return the label attributes of the store as an array of strings. By default, the File Store 
> only supports one label attribute: *name* unless otherwise specified by the back-end server.

*item:* store.item
> A valid file.store item.

*********************************************
#### getParents( item ) ####
> Get the parent(s) of a store item. Returns an array of store items. By default, 
> File Store items have one parent.

*item:* store.item
> A valid file.store item.

*********************************************
#### getValue( item, attribute, defaultValue ) ####
> Returns the value of the items property identified by parameter *attribute*. 
> The result is always returned as a single item therefore if the store value
> is an array the item at index 0 is returned.

*item:* store.item
> A valid file.store item.

*attribute:* String
> The name of an item attribute/property whose value to return.

*********************************************
#### getValues( item, attribute ) ####
> Returns the values of the items property identified by parameter *attribute*. 
> The result is always returned as an array.

*item:* store.item
> A valid file.store item.

*attribute:* String
> The name of an item attribute/property whose value to return.

*********************************************
#### hasAttribute( item, attribute ) ####

*item:* store.item
> A valid file.store item.

*attribute:* String
> The name of an item attribute/property.

*********************************************
#### isItem( something ) ####
> Returns true if *something* is an item and came from the store instance. Returns
> false if *something* is a literal, an item from another store instance, or is any
> object other than an item.

*something:* AnyType
> Can be anything.

*********************************************
#### isItemLoaded( item ) ####
> Returns true if *item* is loaded into the store otherwise false.

*item:* store.item
> A valid file.store item.

*********************************************
#### isRootItem( item ) ####
> Returns true if *item* is a top-level item in the store otherwise false.

*item:* store.item
> A valid file.store item.

*********************************************
#### loadItem( keywordArgs ) ####
> Given an item, this method loads the item so that a subsequent call to isItemLoaded(item)
> will return true.

*keywordArgs:* Object
> An anonymous object that defines the item to load and callbacks to invoke when the
> load has completed.  The format of the object is as follows:
> { *item*: object, *onItem*: Function, *onError*: Function, *scope*: object }   
> (See dojo.data.api.Read.loadItem for additional details).

*********************************************
#### renameItem( item, newPath, onItem, onError, scope) ####
> Rename a store item. The file associated with the store item will be renamed.
> On successful completion the function *onItem()* is called with a new store item,
> as a result parameter *item* is no longer a valid store item and any custom
> attributes are lost.

> *NOTE:* HTTP POST must be enabled to support rename operations. See the 
> [Server Side Configuration](#server-side-configuration) for details.

*item:* store.item
> A valid file.store item which will become invalid on successful completion.

*newPath:* String
> The new pathname of the item.

*onItem:* Function (Optional)
> The callback function to invoke when the item has successfully been renamed.
> It takes only one parameter, the renamed item: *onItem(newItem)*. 
> Please note that the parameter *newItem* is a new store item.

*onError:* Function (Optional)
> The onError parameter is the callback to invoke when the item rename encountered
> an error. It takes two parameter, the error object and the optional HTTP status
> code when available: onError(err, status). If the HTTP status code is not available
> parameter *status* is undefined.

*scope:* Object (Optional)
> If a scope object is provided, all of the callback functions (onItem,    onError, etc)
> will be invoked in the context of the scope object. In the body of the callback
> function, the value of the "this" keyword will be the scope object otherwise
> window.global is used.

*********************************************
#### setValue( item, attribute, newValue ) ####
> Assign a new value to the items attribute/property. This method only allows
> modification of custom attributes, that is, any read-only or store private
> attributes are excluded. Please refer to *renameItem()* to change the 
> identity (path) of a store item. 

*item:* store.item
> A valid file.store item.

*attribute:* String
> The name of a custom attribute/property whose value to set.

*newValue:* AnyType
> The new values to be assigned to the attribute/property.

*********************************************
#### setValues( item, attribute, newValues ) ####
> Assign an array of new values to the items attribute/property. The parameter
> *newValues* must be an array otherwise an error is thrown. This method only allows
> modification of custom attributes, that is, any read-only or store private
> attributes are excluded. Please refer to *renameItem()* to change the 
> identity (filename) of a store item. 

*item:* store.item
> A valid file.store item.

*attribute:* String
> The name of a custom attribute/property whose value to set.

*newValues:* AnyType[]
> Array of new values to be assigned to the attribute/property. If *newValues* is an empty array
> setValues() act the same as unsetAttribute.

*********************************************
#### unsetAttribute: function ( item, attribute ) ####
Unset an items attribute/property. Unsetting an attribute will remove the attribute from the item.

*item:* store.item
> A valid file.store item.

*attribute:* String
> The name of the items attribute/property to be unset


<h2 id="file-store-callbacks">File Store Callbacks</h2>

#### onDelete( deletedItem ) ####

*deleteItem:* store.item
> A valid file.store item.

#### onLoad( count ) ####

*count:* Number
> The number of store items that have been successfully loaded.

#### onNew( newItem, parentInfo) ####

#### onSet( item, atribute, oldValue, newValue ) ####


<h2 id="sample-application">Sample Application</h2>

The following sample application shows the document root directory of the back-end server
as a simple tree with checkboxes. Notice that because the model property *checkedStrict* 
is disabled the FileStoreModel will automatically apply lazy loading.

    <!DOCTYPE html>
    <html>
      <head> 
        <meta charset="utf-8">
        <title>Dijit CheckBox Tree and File Store</title>     
        <style type="text/css">
          @import "../../dijit/themes/claro/claro.css";
          @import "../themes/claro/claro.css";
        </style>

        <script type="text/javascript">
          var dojoConfig = {
                async: true,
                parseOnLoad: true,
                isDebug: false,
                baseUrl: "../../",
                packages: [
                  { name: "dojo",  location: "dojo" },
                  { name: "dijit", location: "dijit" },
                  { name: "cbtree",location: "cbtree" }
                ]
          };
        </script>

        <script type="text/javascript" src="../../dojo/dojo.js"></script> 
        <script type="text/javascript">
          require([
            "dojo/ready",
            "cbtree/Tree",                  // Checkbox tree
            "cbtree/models/FileStoreModel", // FileStoreModel
            "cbtree/stores/FileStore"
            ], function( ready, Tree, FileStoreModel, FileStore) {

              // Because of the generic nature of this demo it has no knowledge of the file system layout
              // under the DOCUMENT_ROOT, therefore the 'basePath' is set to the document root itself.

              var store = new FileStore( { url: "../stores/server/php/cbtreeFileStore.php", basePath:"."} ); 
              var model = new FileStoreModel( {
                      store: store,
                      rootLabel: 'My HTTP Document Root',
                      checkedRoot: true,
                      checkedStrict: false,
                      queryOptions: {ignoreCase:true},
                      sort: [{attribute:"directory", descending:true},{attribute:"name"}]
                   }); 

              ready(function() {
                var tree = new Tree( { model: model, id: "MenuTree" }, "CheckboxTree" );
                tree.startup();
              });
            });
        </script>
      </head>
        
      <body class="claro">
        <h1 class="DemoTitle">Dijit CheckBox Tree with a File Store</h1>
        <div id="CheckboxTree">  
        </div>
      </body> 
    </html>

### Fancy Tree Styling ###

The following sample applies *Fancy Icons* to the tree 

    <!DOCTYPE html>
    <html>
      <head> 
        <meta charset="utf-8">
        <title>Dijit CheckBox Tree and File Store</title>     
        <!--   
          Load the CSS files including the Apache style icons, alternatively load fileIconsMS.css 
          instead to get Microsoft Windows style icons (but not both).
        -->
        <style type="text/css">
          @import "../../dijit/themes/claro/claro.css";
          @import "../themes/claro/claro.css";
          @import "../icons/fileIconsApache.css";
        </style>

        <script type="text/javascript">
          var dojoConfig = {
                async: true,
                parseOnLoad: true,
                isDebug: false,
                baseUrl: "../../",
                packages: [
                  { name: "dojo",  location: "dojo" },
                  { name: "dijit", location: "dijit" },
                  { name: "cbtree",location: "cbtree" }
                ]
          };
        </script>

        <script type="text/javascript" src="../../dojo/dojo.js"></script> 
        <script type="text/javascript">
          require([
            "dojo/ready",
            "cbtree/Tree",                  // Checkbox tree
            "cbtree/TreeStyling",           // Checkbox tree Styling
            "cbtree/models/FileStoreModel", // FileStoreModel
            "cbtree/stores/FileStore"
            ], function( ready, Tree, TreeStyling, FileStoreModel, FileStore) {

              // Because of the generic nature of this demo it has no knowledge of the file system layout
              // under the DOCUMENT_ROOT, therefore the 'basePath' is set to the document root itself.

              var store = new FileStore( { url: "../stores/server/php/cbtreeFileStore.php", 
                                           basePath:".",
                                           options:["iconClass"] } ); 

              // Tell the model to look for the store item property 'icon' and process it as an icon.
              var model = new FileStoreModel( {
                      store: store,
                      rootLabel: 'My HTTP Document Root',
                      checkedRoot: true,
                      checkedStrict: false,
                      iconAttr: "icon",
                      queryOptions: {ignoreCase:true},
                      sort: [{attribute:"directory", descending:true},{attribute:"name"}]
                   }); 

              ready(function() {
                // Create the tree and set the icon property so the tree root uses the same set of icons
                // all tree nodes will use (not required but for consistancy only).

                var tree = new Tree( { model: model, id: "MenuTree", icon: {iconClass:"fileIcon"} }, "CheckboxTree" );
                tree.startup();
              });

            });
        </script>
      </head>
        
      <body class="claro">
        <h1 class="DemoTitle">Dijit CheckBox Tree with a File Store and Fancy Icons</h1>
        <div id="CheckboxTree">  
        </div>
      </body> 
    </html>
    
Finally, the next sample is a simple Windows style explorer taking the declarative approach:

    <!DOCTYPE html>
    <html>
      <head> 
        <meta charset="utf-8">
        <title>Dijit CheckBox Tree using the cbtree File Store</title>     
         <style type="text/css">
          @import "../../dijit/themes/claro/claro.css";
          @import "../../dojox/grid/resources/claroGrid.css";
          @import "../../cbtree/icons/fileIconsMS.css";
          @import "../themes/claro/claro.css";

          html,body { height: 100%; margin: 0; overflow: hidden; padding: 0; }
          #appLayout { height: 100%; }
        </style>

        <script type="text/javascript">
          var dojoConfig = {
                async: true,
                parseOnLoad: false,
                isDebug: true,
                baseUrl: "../../",
                packages: [
                  { name: "dojo",  location: "dojo" },
                  { name: "dojox", location: "dojox" },
                  { name: "dijit", location: "dijit" },
                  { name: "cbtree",location: "cbtree" }
                ]
          };
        </script>

        <script type="text/javascript" src="../../dojo/dojo.js"></script> 
        <script>
          require([ "dojo/_base/lang",
                    "dojox/grid/DataGrid",
                    "dojo/parser",
                    "dojo/domReady!"
                  ], function (lang, DataGrid, parser) {

            // Overwrite the store event handlers of the DataGrid
            lang.extend( DataGrid, {
              _onDelete: function() {},
              _onNew: function() {},
              _onSet: function() {}
            });
            parser.parse();
          });
        </script> 

        <script>
          require([ "dojo/_base/connect",
                    "dijit/layout/BorderContainer",
                    "dijit/layout/TabContainer",
                    "dijit/layout/ContentPane",
                    "cbtree/Tree",                   // Checkbox Tree
                    "cbtree/TreeStyling",           // Tree Styling extensions
                    "cbtree/models/FileStoreModel", // Forest Store Model
                    "cbtree/stores/FileStore",      // File Store
                    "cbtree/stores/BreadCrumb"      // Breadcrumb trail
                  ]);
        </script>

        <script type="text/javascript">  
          var sortFields = [{attribute:"directory", descending:true},{attribute:"name", ignoreCase:true}];
          var queryOptions = { deep: true, storeOnly: true };
          var layoutFiles = [
            [
              { field: "name", name: "Filename", width: 20 },
              { field: "size", name: "File Size (bytes)", width: 10 },
              { field: "directory", name: "Is Directory", width: 10 },
              { field: "path", name: "Path", width: 'auto' }
            ]
          ];

          function pathToRegex( path ) {
            // summary:
            //    Convert a path string into a regular expression (not a pattern)...
            var segm  = path.split("/");
            var regex = "(^\\.";
            var i;
            
            for( i=0; i<segm.length; i++) {
              if (segm[i] !== ".") {
                regex = regex + "\\/" + segm[i];
              }
            }
            regex = regex + "\\/[^\\/]*$)"
            return regex;
          }
          
          function setQuery( path ) {
            // summary:
            //    Set and execute the new query string for the grid and update
            //    the breadcrumb trail.
            grid.setQuery( {path: pathToRegex(path)}, queryOptions );
            grid.selection.deselectAll();
            trail.setTrail( path );
          }

          function updateGrid( item ) {
            // summary:
            //    Update the grid with the new item data. If the item is currently
            //    not loaded in the store go load it first.
            if (!store.isItemLoaded(item)) {
              store.loadItem( { item: item,  onItem: updateGrid });
            } else {
              setQuery( store.getValue(item,"path") );
            }
          }

          function treeClicked( item, nodeWidget, evt ) {
            if (nodeWidget !== tree.rootNode) {
              updateGrid( item );
            } else {
              setQuery( "." );
            }
          }

          function gridClicked(rowIndex) {
            var item = grid.getItem(rowIndex);
            if (item.directory) {
              updateGrid(item);
            }
          }
        </script>
      </head>
        
      <body class="claro">
        <div data-dojo-id="store" data-dojo-type="cbtree/stores/FileStore" 
          data-dojo-props='url:"../../cbtree/stores/server/php/cbtreeFileStore.php",
          cache:false, options:["iconClass"]'>
        </div>
     
        <div data-dojo-id="model" data-dojo-type="cbtree/models/FileStoreModel" data-dojo-props='store:store,
          query:{directory:true}, queryOptions:{ignoreCase:true}, rootLabel:"My Files", labelAttr:"name", 
          iconAttr:"icon", checkedStrict:false'>
        </div>

      
        <div id="appLayout" class="demoLayout" data-dojo-type="dijit.layout.BorderContainer" data-dojo-props="design:'headline'">      
          <div class="edgePanel edgeTop" data-dojo-type="dijit.layout.ContentPane" data-dojo-props="region: 'top'">
            <div data-dojo-id="trail" data-dojo-type="cbtree/stores/BreadCrumb" data-dojo-props='store:store,
             cssBaseClass:"fileIcon"' onClick=updateGrid style="width: 100%; height:32px;"></div>
          </div>
          <div class="edgePanel" data-dojo-type="dijit.layout.ContentPane" 
               data-dojo-props="region: 'left', splitter: true" style="width:25%;">
            <div data-dojo-id="tree", data-dojo-type="cbtree/Tree" data-dojo-props='model:model,
              checkBoxes:false, icon:"fileIcon", onClick: treeClicked, persist:false'>
            </div>
          </div>

          <div id="mainLevel" class="centerPanel" data-dojo-type="dijit.layout.ContentPane" data-dojo-props="region:'center'">
            <div data-dojo-id="grid" data-dojo-type="dojox/grid/DataGrid" data-dojo-props='store:store, 
              structure:layoutFiles, query:{path:pathToRegex(".")}, queryOptions: queryOptions, 
              sortFields: sortFields, selectionMode:"single", onSelected:gridClicked' 
              style="width: 99%; height:500px;">
            </div>            
          </div>
        </div>
      </body>
    </html>

Please note that the above sample application requires DOJOX to be installed on your system.