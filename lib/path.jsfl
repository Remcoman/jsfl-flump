
var path = {
    pixelRatioSuffix : function (pixelRatio) {
        return pixelRatio > 1 ? "@" + pixelRatio + "x" : "";
    },
    
    resolvePixelRatio : function (path) {
        var match = path.match(/^(.+?)@([0-9])x\.fla$/);
        if(match) {
            return {path : match[1] + ".fla", pixelRatio : parseInt(match[2], 10)}    
        }
        else {
            return {path : path, pixelRatio : 1};
        }
    },
    
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
	},
    
    isAbsolute : function (path) {
        return /^([\w ]+[:\|]|\/|{\w+})/.test(path);
    },
    
    resolve : function (cwd, path) {
        if(this.isAbsolute(path)) {
            return path;
        }
    
        path = cwd + "/" + path;
        
        var absolute = path.match(/^([\w ]+[:\|]|\/|{\w+})/);
        if(absolute) {
            path = path.substr(absolute[0].length);
        }
        
        var parts = path.split(/[\/\\]/g), 
            result = [];

        for (var x = 0, partsLength = parts.length; x < partsLength; x++) {
            if (parts[x] === "..") {
                result.pop();
            }
            else if (parts[x] !== "." && parts[x] !== "") {
                result.push(parts[x]);
            }
        }
        
        return absolute[0] + result.join("/");
    }
}