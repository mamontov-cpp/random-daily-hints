var gui = require('nw.gui');
var fs = require('fs');
// Current window
var me = gui.Window.get();
// Name of file with current position of window, which will be stored before sessions
var settingsFileName = 'screenpos.json';
var tray = null;

// Init syntax highlighting on load
hljs.initHighlightingOnLoad();


/**
 * http://stackoverflow.com/questions/2727167/getting-all-filenames-in-a-directory-with-node-js
 * Fetches list of files from directory, recursively
 * @param {String} a directory for getting files
 * @param {String[]} a list of other files
 * @return String[]
 */
function getFiles (dir, files){
	files = files || [];
	var readFiles = fs.readdirSync(dir);
	for (var i in readFiles){
		var name = dir + '/' + readFiles[i];
		if (fs.statSync(name).isDirectory()){
			getFiles(name, files);
		} else {
			files.push(name);
		}
	}
	return files;
}

/** Initializes icon in tray
 */ 
function initTrayIcon() {
	var tray = new gui.Tray({ title: 'Random Daily Hints', icon: 'icon.png' });
	var hidden = false;
	tray.on('click', function() {
		if (hidden) {
			hidden = false;
			me.show();
		} else {
			hidden = true;
			me.hide();
		}
	});
}

/** Saves current window positon into file
 */
function saveWindowPosition() {
	fs.writeFileSync(settingsFileName, JSON.stringify({'x' : me.x, 'y' : me.y}));
}

/** Exits application
 */
function exitApplication() {
	gui.App.closeAllWindows();
	me.close(true);
}

/**
 * Tries to load window position from file
 */
function tryLoadWindowPosition() {
	// Try load old position of window from a settings file
	if (fs.existsSync(settingsFileName)) {
		fs.readFile(settingsFileName, 'utf8', function(err, data) {
			if (err)
				return;
			try {
				var pos = JSON.parse(data);
				if (typeof pos == "object" && pos != null) {
					if (typeof pos["x"] == "number" && typeof pos["y"] == "number") {
						me.moveTo(pos["x"], pos["y"]);
					}
				}
			} catch(e) {
				console.log("Failed to load file: " + e.message);
			}
		});
	}
}

/**
 * Displays hint from data
 * @param {String} data a data
 */
function displayHint(data) {
	$("#content").html(data);
	$("#content pre code").each(function(i, block) { hljs.highlightBlock(block); });
	var script = $("#content script").toArray();
	for(var i = 0; i < script.length; i++) {
		try {
			eval($(script[i]).html());
		} catch (e) {
			console.log(e.message);
		}
	}
}