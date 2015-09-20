include("JSON.jsfl");
include("helpers.jsfl");
include("path.jsfl");

var LibraryJSON = (function () {
	
	var writeAtlas = function (textureGroupJSON, img, frames) {
		var atlasJSON = {file : img, textures : []};
		
		frames.forEach(function (frame) {
			atlasJSON.textures.push({
				origin : frame.origin, 
				rect : frame.rect,
				symbol : frame.name
			});
		});

		textureGroupJSON.atlases.push(atlasJSON);
	}
	
	var getKeyframes = function(layer){
		var kfs = [];
		layer.frames.forEach(function (frame, index) {
			if(index == frame.startFrame) {
				kfs.push({frame : frame, index : index});
			}
		});
		return kfs;
	}
	
	var groupByImg = function (frames) {
		var group = {};
		frames.forEach(function (frame) {
			var frameList = group[frame.img];
			if(!frameList) {
				frameList = group[frame.img] = [];
			}
			frameList.push(frame);
		});
		return group;
	}
	
	var writeKeyframes = function (layerJSON, keyframes) {
		keyframes.forEach(function (kf) {
			var frame = kf.frame;
			var kfJSON = {duration : frame.duration, index : kf.index};
			
			if(frame.elements.length) {
				var element = frame.elements[0];
			
				if(!element.libraryItem) {
					return;
				}
				
				kfJSON.ref = path.basename(element.libraryItem.name);
				
				var pos = helpers.getPosition(element);
				kfJSON.loc = [pos.x, pos.y];
				
				if(element.scaleX !== 1 || element.scaleY !== 1) {
					kfJSON.scale = [element.scaleX, element.scaleY];
				}
				
				if(element.skewX !== 0 || element.skewY !== 0) {
					kfJSON.skewX = element.skewX * (Math.PI/180);
					kfJSON.skewY = element.skewY * (Math.PI/180);
				}
				
				if(element.alpha !== 1) {
					kfJSON.alpha = element.alpha;
				}
				
				if(kf.name) {
					kfJSON.label = kf.name;
				}
				
				var transformPoint = element.getTransformationPoint();
				kfJSON.pivot = [transformPoint.x, transformPoint.y];
				kfJSON.ease = frame.tweenEasing / 100;
				kfJSON.tweened = frame.tweenType !== "none";
				kfJSON.visible = element.visible;
			}
			
			layerJSON.keyframes.push(kfJSON);
		});
	}
	
	var writeLayer = function (movieJSON, layer, isFlipbookLayer) {
		var layerJSON = {name : layer.name, keyframes : [], flipbook : !!isFlipbookLayer};
		
		writeKeyframes(layerJSON, getKeyframes(layer));
		
		movieJSON.layers.push(layerJSON);
	}
	
	var writeTextureGroups = function (textureGroupArray, frames) {
		var textureGroupJSON = {scaleFactor : 1, atlases : []};
		textureGroupArray.push(textureGroupJSON);
		
		var g = groupByImg(frames);
		
		for(var img in g) {
			atlasFrames = g[img];
			writeAtlas(textureGroupJSON, img, atlasFrames);
		}
	}
	
	var writeMovies = function (movieArray, symbolBucket) {
		symbolBucket.movies.forEach(function (movieSymbol) {
			var movieJSON = {layers : [], id : path.basename(movieSymbol.name)};
			var hasFlipbook = symbolBucket.hasFlipbook(movieSymbol.name);
			
			movieSymbol.timeline.layers.forEach(function (layer, index) {
				if(isValidLayer(layer)) {
					writeLayer(movieJSON, layer, hasFlipbook && index === 0);
				}
			});
			
			movieArray.push(movieJSON);
		});
	}
	
	var isValidLayer = function (layer) {
		return layer.layerType === "normal" || layer.layerType === "masked";
	}
	
	var exports	= function (doc) {		
		this.movies = [];
		this.textureGroups = [];
		this.frameRate = doc.frameRate;
	}

	exports.prototype = {
		write : function (symbolBucket, frames) {
			writeTextureGroups(this.textureGroups, frames);
			writeMovies(this.movies, symbolBucket);
		},
		
		toJSON : function () {
			return JSON.encode(this);
		}
	}
	
	return exports;
})();

