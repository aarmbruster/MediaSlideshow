var gGalleryIndex = 0;      // gallery currently being iterated
var entryIndex = 0;
var gGalleryReader = null; // the filesytem reader for the current gallery
var gDirectories = [];     // used to process subdirectories
var gGalleryArray = [];    // holds information about all top-level Galleries found - list of DomFileSystem
var gGalleryData = [];     // hold computed information about each Gallery
var entryDataArray = [];
var gCurOptGrp = null;
var imgFormats = ['png', 'bmp', 'jpeg', 'jpg', 'gif', 'png', 'svg', 'xbm', 'webp'];
var audFormats = ['wav', 'mp3'];
var vidFormats = ['mp4', 'ogg', 'webm'];
var timeout = null;

function errorPrintFactory(custom) {
   return function(e) {
      var msg = '';

      switch (e.code) {
         case FileError.QUOTA_EXCEEDED_ERR:
            msg = 'QUOTA_EXCEEDED_ERR';
            break;
         case FileError.NOT_FOUND_ERR:
            msg = 'NOT_FOUND_ERR';
            break;
         case FileError.SECURITY_ERR:
            msg = 'SECURITY_ERR';
            break;
         case FileError.INVALID_MODIFICATION_ERR:
            msg = 'INVALID_MODIFICATION_ERR';
            break;
         case FileError.INVALID_STATE_ERR:
            msg = 'INVALID_STATE_ERR';
            break;
         default:
            msg = 'Unknown Error';
            break;
      };
      console.log(custom + ': ' + msg);
   };
}

function GalleryData(_id) {
   this.id = _id;
   this.path = "";
   this.sizeBytes = 0;
   this.numFiles = 0;
   this.numDirs = 0;
}

function EntryData(id) {
   this._id = id;
   this.path = "";
   this.timeout = 12000;
   this.sizeBytes = 0;
   this.numFiles = 0;
   this.numDirs = 0;
}

function addImageToContentDiv() {
   var content_div = document.getElementById('content');
   if(image)
   {
     image.src = "";
     image = null;
   }
   
   image = document.createElement('img');
   content_div.setAttribute("width", image.width);
   content_div.setAttribute("height", image.height);
   content_div.appendChild(image);
   return image;
}

function addAudioToContentDiv() {
   var content_div = document.getElementById('content');
   var audio = document.createElement('audio');
   audio.setAttribute("controls","controls");
   
   content_div.appendChild(audio);
   return audio;
}

var video = null;
var image = null;

function addVideoToContentDiv() {
  
  if(video)
     {
       video.pause();
       video.src =""; // empty source
       video.load();
       video = null;
     }
  
   var content_div = document.getElementById('content');
   video = document.createElement('video');
   video.setAttribute("autoPlay", "true");
   content_div.appendChild(video);
   return video;
}

function getFileType(filename) {
   var ext = filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
   if (imgFormats.indexOf(ext) >= 0)
      return "image";
   else if (audFormats.indexOf(ext) >= 0)
      return "audio";
   else if (vidFormats.indexOf(ext) >= 0)
      return "video";
   else return null;
}

function clearContentDiv() {
   var content_div = document.getElementById('content');
   while (content_div.childNodes.length >= 1) {
      content_div.removeChild(content_div.firstChild);
   }
}

function clearList() {
   document.getElementById("GalleryList").innerHTML = "";
}

//Adds a Gallery to the document List
function addGallery(name, id) {
   var optGrp = document.createElement("optgroup");
   optGrp.setAttribute("label",name);
   optGrp.setAttribute("id", id);
   return optGrp;
}
//Adds a media file to the document List
function addItem(itemEntry) {
   var opt = document.createElement("option");
   if (itemEntry.isFile) {
      opt.setAttribute("data-fullpath", itemEntry.fullPath);
      var mData = chrome.mediaGalleries.getMediaFileSystemMetadata(itemEntry.filesystem);
      opt.setAttribute("data-fsid", mData.galleryId);
   }
   opt.appendChild(document.createTextNode(itemEntry.name));
   gCurOptGrp.appendChild(opt);
}


function updateMedia()
{
  clearTimeout(timeout);
  timeout = null;
  
  var fs = null;
  var i;
   // get the filesystem that the selected file belongs to
   for (i=0; i < gGalleryArray.length; i++) 
   {
      var mData = chrome.mediaGalleries.getMediaFileSystemMetadata(gGalleryArray[i]);

      if (mData.galleryId == gGalleryData[i].id)
      {
         fs = gGalleryArray[i];
         break;
      }
   }
   if(fs)
   {
     
     var path = entryDataArray[entryIndex].path;
     
      fs.root.getFile(path, {create: false}, function(fileEntry) 
      {
         var newElem = null;
         // show the file data
         clearContentDiv();
         var type = getFileType(path);
  
         if (type == "image")
         {
            newElem = addImageToContentDiv();
         } else if (type == "audio") {
            newElem = addAudioToContentDiv();
         } else if (type == "video") {
            newElem = addVideoToContentDiv();
         }
         
         if (newElem) {
            // Supported in Chrome M37 and later.
            if (!chrome.mediaGalleries.getMetadata) {
              newElem.setAttribute('src', fileEntry.toURL());
            } else {
              fileEntry.file(function(file) {
                 chrome.mediaGalleries.getMetadata(file, {}, function(metadata) {
                    if (metadata.attachedImages.length) {
                       var blob = metadata.attachedImages[0];
                       var posterBlobURL = URL.createObjectURL(blob);
                       newElem.setAttribute('poster', posterBlobURL);
                    }
                    newElem.setAttribute('src', fileEntry.toURL());
                    
                 });
              });
            }
         }
      });
   }
   
   var wait = entryDataArray[entryIndex].timeout;
   timeout = setTimeout(function(){cycleForward();}, wait);
}

function cycleForward()
{
  entryIndex = (entryIndex + 1) % entryDataArray.length;
  updateMedia();
}

function cycleBackward()
{
  entryIndex--;
  if(entryIndex == -1)
  {
    entryIndex = entryDataArray.length - 1;
  }
  updateMedia();
}

function scanGallery(entries) 
{
   // when the size of the entries array is 0, we've processed all the directory contents
   entryIndex = 0;
   entryData = [];
   scanIndex = 0;
   var type;
   var eIndex;
   var galleryIndex;
   var entriesLength = 0;
   //Add up all the entries that follow our media filetype requirements
   for(galleryIndex = 0; galleryIndex < gGalleryData.length; galleryIndex++)
   {
     for(eIndex = 0; eIndex < entries.length; eIndex++)
     {
       type = getFileType(entries[eIndex].fullPath);
       if (type == "image" || type == "audio" || type == "video")
       {
         entriesLength++;
       }
     }
   }
   
   //asyncronously go through and add all the EntryDatas into the entryDataArray using the function addEntryData
   for(galleryIndex = 0; galleryIndex < gGalleryData.length; galleryIndex++)
   {
     for(eIndex = 0; eIndex < entries.length; eIndex++)
     {
       type = getFileType(entries[eIndex].fullPath);
       switch(type)
       {
          case "image":
            getImageMedia(entries[eIndex], galleryIndex, entriesLength, addEntryData);
            break;
          case "audio":
            getAudioMedia(entries[eIndex], galleryIndex, entriesLength, addEntryData);
            break;
          case "video":
            getVideoMedia(entries[eIndex], galleryIndex, entriesLength, addEntryData);
            break;
       }
     }
   }
}

function scanGalleries(fs) {
   var mData = chrome.mediaGalleries.getMediaFileSystemMetadata(fs);
   
   gGalleryData[gGalleryIndex] = new GalleryData(mData.galleryId);
   gGalleryData[gGalleryIndex].path = mData.name;
   
   gGalleryReader = fs.root.createReader();
   gGalleryReader.readEntries(scanGallery, errorPrintFactory('readEntries'));

   chrome.mediaGalleries.addGalleryWatch(mData.galleryId, onGalleryWatchAdded);
}

function resetGalleries(results)
{
  results.forEach(function(item, indx, arr) {
    var mData = chrome.mediaGalleries.getMediaFileSystemMetadata(item);
    
    if(indx == arr.length-1)
    {
      return;
    }
      
    chrome.mediaGalleries.dropPermissionForMediaFileSystem (mData.galleryId, function(){
    });
  });
}

function addEntryData(entry, length)
{
  entryDataArray[entryDataArray.length] = entry;
  if(length == entryDataArray.length)
  {
    entryDataArray.sort(function(a, b)
    {
      if(a.path < b.path) return -1;
      if(a.path > b.path ) return 1;
      return 0;
    });
    updateMedia();
  }
}

function getImageMedia(entry, galleryIndex, entryLength, callback)
{
  var entryData = new EntryData(gGalleryData[0].id);
  entryData.path = entry.fullPath;
  entryData.width = entry.width;
  entryData.height = entry.height;
  entryData.timeout = 12000;
  callback(entryData, entryLength);
}

function getVideoMedia(entry, galleryIndex, entryLength, callback)
{
  var entryData = new EntryData(gGalleryData[galleryIndex].id);
  entryData.path = entry.fullPath;
  entryData.width = entry.width;
  entryData.height = entry.height;
  
  var fs = gGalleryArray[galleryIndex];
  fs.root.getFile(entry.fullPath, {create: false}, function(fileEntry)
  {
    fileEntry.file(function(file) 
    {
        chrome.mediaGalleries.getMetadata(file, {"metadataType":"all"}, function(metadata) 
        {
          entryData.timeout = metadata.duration * 1000;
          callback(entryData, entryLength);
       });
    });
  });
}

function getAudioMedia(entry, galleryIndex, entryLength, callback)
{
  var entryData = new EntryData(gGalleryData[galleryIndex].id);
  entryData.path = entry.fullPath;
  entryData.width = entry.width;
  entryData.height = entry.height;
  
    var fs = gGalleryArray[galleryIndex];
    fs.root.getFile(entry, {create: false}, function(fileEntry)
    {
      fileEntry.file(function(file)
      {
         chrome.mediaGalleries.getMetadata(file, {"metadataType":"all"}, function(metadata)
         {
            entryData.timeout = metadata.duration * 1000;
            callback(entryData, entryLength);
      });
    });
  });
}

function getGalleriesInfo(results) {
   
   if (results.length) 
   {
      gGalleryArray = results; // store the list of gallery directories
   }
   else 
   {
      console.log("No galleries found");
   }

   gGalleryIndex = 0;
   
   for(var i = 0; i < gGalleryArray.length; i++)
   {
     scanGalleries(gGalleryArray[i]);
   }
}

function onGalleryWatchAdded() 
{
  if (chrome.runtime.lastError) 
  {
    console.log("Gallery watch not added", chrome.runtime.lastError.message);
  }
}

window.addEventListener("load", function() {
  
  chrome.commands.onCommand.addListener(function(command) 
  {
    chrome.mediaGalleries.getMediaFileSystems({ interactive : 'yes'}, getGalleriesInfo);
  });
  
   // __MGA__bRestart is set in the launcher code to indicate that the app was
   // restarted instead of being normally launched
   if (window.__MGA__bRestart) {
      // if the app was restarted, get the media gallery information
      chrome.mediaGalleries.getMediaFileSystems({
         interactive : 'if_needed'
      }, getGalleriesInfo);
   }
   
    chrome.mediaGalleries.getMediaFileSystems({
         interactive : 'if_needed'
      }, getGalleriesInfo);
   
   
   document.getElementById("left-arrow").addEventListener("click", function(e)
   {
     cycleBackward();
   });
   
   document.getElementById("right-arrow").addEventListener("click", function(e)
   {
     cycleForward();
   });
   
   document.getElementById('content').addEventListener("click", function(e)
   {
     var width = document.getElementById('content').offsetWidth;
     if(e.x < width / 2)  
     {
       cycleBackward();
     } else {
       cycleForward();
     }
   });
});
