﻿var SymbolBucket = (function () {
	
	var exports = function () {
		this.movies = [];
		this._moviesByName = {};
		
		this.sprites = [];
		this._spritesByName = {};
		
		this.flipbooks = [];
		this._flipbooksByName = {};
	}

	exports.prototype = {
		isValid : function () {
			return this.flipbooks.length === 0 || this.sprites.length === 0;
		},
		
		symbolIsFlipbook : function (symbol) {
			return symbol.timeline.layerCount > 0 && symbol.timeline.layers[0].name === "flipbook";
		},

		hasMovie : function (name) {
			return name in this._moviesByName;
		},

		hasSprite : function (name) {
			return name in this._spritesByName;
		},

		hasFlipbook : function (name) {
			return name in this._flipbooksByName;
		},

		add : function (symbol) {
			if(symbol.linkageBaseClass === "flash.display.Sprite") {
				this.sprites.push(symbol);
				this._spritesByName[symbol.name] = symbol;
				
				return true;
			}
			else if(symbol.itemType === "movie clip" && symbol.linkageExportForAS) {
				if(this.symbolIsFlipbook(symbol)) {
					this.flipbooks.push(symbol);
					this._flipbooksByName[symbol.name] = symbol;
				}
				this.movies.push(symbol);
				this._moviesByName[symbol.name] = symbol;
				
				return true;
			}
			
			return false;
		}
	}

	exports.fromLibrary = function (lib) {
		var bucket = new this();
		lib.items.forEach(function (item) {
			bucket.add(item);
		});
		return bucket;
	}
	
	return exports;
	
})();
