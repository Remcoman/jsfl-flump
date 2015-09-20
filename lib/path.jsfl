
var path = {
	basename : function (path, ext) {
		var name = path.split("/").pop();
		if(ext && this.extname(name) === ext) {
			name = name.slice(0, -ext.length);
		}
		return name;
	},
	
	extname : function (path) {
		return path.substr(path.lastIndexOf("."));
	},
	
	dirname : function (path) {
		return path.substring(0, path.lastIndexOf("/"));
	}
}