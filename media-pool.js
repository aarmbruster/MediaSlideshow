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
var vidFormats = ['3gp', '3gpp', 'avi', 'flv', 'mpeg', 'mpeg4', 'mp4', 'ogg', 'webm'];
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
   this.timeout = 10000;
   this.sizeBytes = 0;
   this.numFiles = 0;
   this.numDirs = 0;
}

function addImageToContentDiv() {
   var content_div = document.getElementById('content');
   var image = document.createElement('img');
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

function addVideoToContentDiv() {
   var content_div = document.getElementById('content');
   var video = document.createElement('video');
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
        console.log(path);
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
   
   timeout = setTimeout(function(){cycleForward();}, entryDataArray[entryIndex].timeout);
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
   for(var galleryIndex = 0; galleryIndex < gGalleryData.length; galleryIndex++)
   {
     for(var eIndex = 0; eIndex < entries.length; eIndex++)
     {
       var entryData = new EntryData(gGalleryData[galleryIndex].id);
       entryData.path = entries[eIndex].fullPath;
       entryData.width = entries[eIndex].width;
       entryData.height = entries[eIndex].height;
       
       var type = getFileType(entryData.path);
       
       if (type == "image")
       {
          entryData.timeout = 12000;
       } else if (type == "audio") {
          var fs = gGalleryArray[galleryIndex];
         fs.root.getFile(entryData.path, {create: false}, function(fileEntry)
        {
           fileEntry.file(function(file) {
               chrome.mediaGalleries.getMetadata(file, {"metadataType":"all"}, function(metadata) {
                  entryData.timeout = metadata.duration * 1000;
                  
               });
            });
        });
       } else if (type == "video") {
         var fs = gGalleryArray[galleryIndex];
         fs.root.getFile(entryData.path, {create: false}, function(fileEntry)
        {
           fileEntry.file(function(file) {
               chrome.mediaGalleries.getMetadata(file, {"metadataType":"all"}, function(metadata) {
                  entryData.timeout = metadata.duration * 1000;
               });
            });
        });
       }
       
       entryDataArray[eIndex] = entryData;
     }
   }
   
   entryDataArray.sort(function(a, b)
   {
      if(a.path < b.path) return -1;
      if(a.path > b.path ) return 1;
      return 0;
   });
   updateMedia();
}

//
function scanGalleries(fs) {
   var mData = chrome.mediaGalleries.getMediaFileSystemMetadata(fs);
   //gCurOptGrp = addGallery(mData.name, mData.galleryId);
   
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

function getGalleriesInfo(results) {
   //clearContentDiv();
   if (results.length) {
      var str = 'Gallery count: ' + results.length + ' ( ';
      results.forEach(function(item, indx, arr) {
         var mData = chrome.mediaGalleries.getMediaFileSystemMetadata(item);
         if (mData) {
            str += mData.name;
            if (indx < arr.length-1)
               str += ",";
            str += " ";
         }
      });
      str += ')';
      //document.getElementById("status").innerText = str;
      gGalleryArray = results; // store the list of gallery directories

      //document.getElementById("read-button").disabled = "";
   }
   else {
      //document.getElementById("status").innerText = 'No galleries found';
      console.log("No galleries found");
      //document.getElementById("read-button").disabled = "disabled";
      clearList();
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
