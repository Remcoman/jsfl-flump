include("path.jsfl");

var flumpifyConfig = (function () {

	var baseConfig = {
		baseScale    : 1,
		scaleFactors : [1],
		baseDir      : null,
		maxSize      : 2048,
		shapePadding : 2,
		borderPadding : 2
	};

	var extend = function (obj1, obj2) {
		for(var prop in obj2) {
			obj1[prop] = obj2[prop];
		}
		return obj1;
	};

	return {
		read : function (doc) {
			var configPath = path.dirname(doc.pathURI) + "/flumpify.json",
				config = extend({}, baseConfig);

			if(FLfile.exists(configPath)) {
				extend(config, JSON.decode(FLfile.read(configPath)));
			}

			return config;
		}
	}
})();