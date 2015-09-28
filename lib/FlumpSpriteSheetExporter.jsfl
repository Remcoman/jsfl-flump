include("path.jsfl");
include("helpers.jsfl");
include("JSON.jsfl");

var FlumpSpriteSheetExporter = (function () {
	
	var SpriteSheetWriter = function (outputDir, sprites, flipbooks) {
		this.outputDir = outputDir;
		this.sprites = sprites;
		this.flipbooks = flipbooks;
		this.metadataPaths = [];
		this.exporter = new SpriteSheetExporter();
	}
	
	SpriteSheetWriter.prototype = {
		
		_writeSingle : function () {
			this.exporter.beginExport();
			
			//reset all the values
			this.exporter.layoutFormat = "JSON";
			this.exporter.allowRotate = false;
			this.exporter.allowTrimming = true;
			this.exporter.algorithm = "maxRects";
			this.exporter.borderPadding = 1;
			this.exporter.maxSheetHeight = this.exporter.maxSheetWidth = 2048;
			
			//write sprites until there is no more space
			while(this.sprites.length) {
				var element = this.sprites.shift();
				
				fl.trace("adding sprite '" + element.name + "' to spritesheet");
				
				this.exporter.addSymbol(element, element.name);

				if(this.exporter.overflowed) {
					fl.trace("spritesheet overflowed!");
					this.sprites.unshift(element);
					this.exporter.removeSymbol(element.name);
					break;
				}
			}
			
			//write flipbooks until there is no more space
			while(this.flipbooks.length) {
				var element = this.flipbooks.shift();
				
				fl.trace("adding flipbook '" + element.name + "' to spritesheet");
				this.exporter.addSymbol(element, element.name, 0, element.libraryItem.timeline.frameCount);

				if(this.exporter.overflowed) {
					fl.trace("spritesheet overflowed!");
					this.flipbooks.unshift(element);
					this.exporter.removeSymbol(element.name);
					break;
				}
			}
			
			var spriteSheetPath = this.outputDir + "/atlas" + this.metadataPaths.length;
			this.metadataPaths.push(spriteSheetPath + ".json");
			
			fl.trace("writing '" + spriteSheetPath + "'");
			
			this.exporter.exportSpriteSheet(spriteSheetPath, {format:"png", bitDepth:32, backgroundColor:"#00000000"}, true);
		},
	
		write : function () {
			var i = 0;
			while(i++ < 10 && (this.sprites.length || this.flipbooks.length)) {
				this._writeSingle();
			}
		}
	}
	
	
	var exports = function (doc) {
		this.tempSymbols = [];
		this.doc = doc;
		this.spriteTextureOrigins = {};
		this.flipbookTextureOrigins = {};
	}
	
	exports.prototype = {
		_createTempSymbol : function (name, copyOf) {
			var symbol;
			if(copyOf) {
				this.doc.library.duplicateItem(copyOf);
				symbol = this.doc.library.getSelectedItems()[0];
				symbol.name = name;
			}
			else {
				this.doc.library.addNewItem("movie clip", name);
				symbol = this.doc.library.getSelectedItems()[0];
			}
			this.tempSymbols.push(name);
			return symbol;
		},
		
		_deleteTempSymbols : function () {
			this.tempSymbols.forEach(function (name) {
				this.doc.library.deleteItem(name);
			}, this);
			this.tempSymbols.length = 0;
		},
		
		_addItemToDoc : function (symbolName) {
			this.doc.library.addItemToDocument({x : 0, y : 0}, symbolName);
			var item = this.doc.selection[0];
			item.name = this._symbolNameToInstanceName(symbolName) + "_"; //we append a _ because spritesheet exporter always adds 0000 after name
			return item;
		},
		
		_symbolNameToInstanceName : function (symbolName) {
			return symbolName.split("/").join("$"); 
		},
		
		_instanceNameToSymbolName : function (instanceName) {
			return instanceName.split("$").join("/"); 
		},
		
		_prepareTemporaryTimeline : function (symbolBucket) {
			if(this.doc.library.itemExists("__temp")) {
				this.doc.library.deleteItem("__temp");
			}
			
			//create a __temp movieclip
			this._createTempSymbol("__temp");
			this.doc.library.editItem("__temp");
			
			var tl = this.doc.getTimeline();
			tl.layers[0].name = "sprites";
			tl.addNewLayer("flipbooks", "normal", false);
			
			//add all sprites to layer 0
			tl.setSelectedLayers(0, true);
			symbolBucket.sprites.forEach(function (symbol) {
				this._addItemToDoc(symbol.name);
			}, this);
			
			//add all flipbooks to layer 1
			tl.setSelectedLayers(1, true);
			symbolBucket.flipbooks.forEach(function (symbol) {
				if(symbol.timeline.layerCount > 1) { //we only want the first layer so we make a copy where only the first layer is available
					symbol = this._createTempSymbol(symbol.name + "__flipbook", symbol.name);
					//delete all layers except the first
					for(var i=1, c = symbol.timeline.layerCount;i < c;i++) {
						symbol.timeline.deleteLayer(i);
					}
				}
				this._addItemToDoc(symbol.name);
			}, this);
		},
		
		_extractTextureOrigins : function () {
			var tl = this.doc.getTimeline();

			tl.layers[0].frames[0].elements.forEach(function (element) {
				this.spriteTextureOrigins[element.libraryItem.name] = helpers.getTextureOrigin(this.doc, element);
			}, this);
			
			tl.layers[1].frames[0].elements.forEach(function (element) {
				this.flipbookTextureOrigins[element.libraryItem.name] = helpers.getTextureOriginInner(this.doc, element);
			}, this);
		},
		
		_writeSpriteSheets : function (outputDir) {
			var tl = this.doc.getTimeline();
			
			//add all the sprites and flipbooks to the spritesheet
			var writer = new SpriteSheetWriter(
				outputDir, 
				tl.layers[0].frames[0].elements,
				tl.layers[1].frames[0].elements
			);
			
			writer.write();
			
			return writer.metadataPaths;
		},
		
		_cleanup : function (metadataPaths) {
			fl.trace("removing temporary symbols and metadata");
			
			this._deleteTempSymbols();
			metadataPaths.forEach(function (path) {
				FLfile.remove(path);
			});
		},
		
		_readFrames : function (symbolBucket, metadataPaths) {
			var frames = [], frameNumberRegex = new RegExp("(.+)_([0-9]+)$");
			
			metadataPaths.forEach(function (path) {
				var metadata = JSON.decode( FLfile.read(path) );
				
				for(var name in metadata.frames) {

					var regexpMatch  = name.match(frameNumberRegex),
						symbolName   = this._instanceNameToSymbolName(regexpMatch[1]),
						frameNum     = parseInt(regexpMatch[2], 10),
						frameRect    = metadata.frames[name].frame,
						origin;
					
					var frame = {
						img : metadata.meta.image,
						rect : [frameRect.x, frameRect.y, frameRect.w, frameRect.h],
					}
					
					//flash puts 0000 after name. Is this the frame number?
					if(symbolBucket.hasFlipbook(symbolName)) { //symbol is flipbook
						frame.symbol = symbolName + "#" + frameNum;
						origin = this.flipbookTextureOrigins[symbolName][frameNum];
					}
					else {
						frame.symbol = symbolName;
						origin = this.spriteTextureOrigins[symbolName];
					}
					
					frame.origin = [origin.x, origin.y];
					
					fl.trace("got frame '" + frame.symbol + "' for image " + metadata.meta.image);
					
					frames.push(frame);
				}
			}, this);
			
			return frames;
		},

		export : function (symbolBucket, outputDir) {
			this._prepareTemporaryTimeline(symbolBucket);
			this._extractTextureOrigins();
			var metadataPaths = this._writeSpriteSheets(outputDir);
			this.frames = this._readFrames(symbolBucket, metadataPaths);
			this._cleanup(metadataPaths);
		}
	}
	
	return exports;
})();
