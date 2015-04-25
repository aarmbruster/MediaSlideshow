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
    }
  );
});
