define(function () {
    return {

        getURLParams: function () {
            var params = {};
            window.location.href.replace(/[?&]+(\w+)([^&]*)/gi, function (m, key) {
                params[key] = true;
                return ""; // does not matter
            });
            window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
                params[key] = decodeURIComponent(value);
                return ""; // does not matter
            });
            return params;
        },

        setURLParam: function (name, value) {
            if (value) {
                var search;
                var urlComponent = encodeURIComponent(value);
                var urlParams = this.getURLParams();
                var existUrlParam = urlParams[name];
                if (existUrlParam) {
                    search = location.search.replace(new RegExp("([?|&]" + name + "=)" + "(.+?)(&|$)"),
                        "$1" + urlComponent + "$3");
                } else if (location.search.length) {
                    search = location.search + "&" + name + "=" + urlComponent;
                } else {
                    search = "?" + name + "=" + urlComponent;
                }
                var params = {};
                params[name] = value;
                var data = { state: { url: search, params: params }, url: search };
                this._pushState(data);
                return data;
            } else {
                return this.removeURLParameter(name);
            }
        },

        removeURLParameter: function (key) {
            var sourceUrl = location.search;
            var rtn = sourceUrl.split("?")[0];
            var param;
            var paramsArr;
            var queryString = (sourceUrl.indexOf("?") !== -1) ? sourceUrl.split("?")[1] : "";
            if (queryString !== "") {
                paramsArr = queryString.split("&");
                for (var i = paramsArr.length - 1; i >= 0; i -= 1) {
                    param = paramsArr[i].split("=")[0];
                    if (param === key) {
                        paramsArr.splice(i, 1);
                    }
                }
                rtn = rtn + "?" + paramsArr.join("&");
            }
            var data = { state: { url: rtn, type: "remove" }, url: rtn };

            this._pushState(data);

            return data;
        },

        _pushState: function (data) {
            if (history) {
                history.replaceState(data.state, document.title, data.url);
            }
        }
    }
});