/**
 * Listens for the app launching, then creates the window.
 *
 * @see http://developer.chrome.com/apps/app.runtime.html
 * @see http://developer.chrome.com/apps/app.window.html
 */
chrome.app.runtime.onLaunched.addListener(function(launchData) {
  
  chrome.power.requestKeepAwake('display');
  
  
  chrome.app.window.create(
    'index.html',
    {
      id: 'mainWindow',
      bounds: {width: 1920, height: 1080}
    },
    function(app_win) {
    		app_win.contentWindow.__MGA__bRestart = false;
    	}
  );
  
  console.log("app launched");
  
});


// Use the runtime event listeners to set a window property indicating whether the
// app was launched normally or as a result of being restarted

chrome.app.runtime.onRestarted.addListener(function() {
    chrome.app.window.create('index.html', 
    	{innerBounds: {width:1920, height:1080, minWidth:1280, maxWidth: 1920, minHeight:720, maxHeight: 1080}, id:"MGExp"}, 
    	function(app_win) {
    		app_win.contentWindow.__MGA__bRestart = true;
    	}
    );
    console.log("app restarted");
});
