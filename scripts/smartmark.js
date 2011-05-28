function SmartMark() {
  let me = this;
  me.utils = new KoalaUtils();
  me.bmsvc = Cc["@mozilla.org/browser/nav-bookmarks-service;1"]
             .getService(Ci.nsINavBookmarksService);
  me.tagsvc = Cc["@mozilla.org/browser/tagging-service;1"]
              .getService(Ci.nsITaggingService);
  me.bookmarkListener = {
    onItemAdded: function(aItemId, aFolder, aIndex) {
      try{
      me.handleSmartmark(aItemId);
      }
      catch(ex){Cu.reportError(ex);}
    },

    onItemChanged: function(){},
    onItemRemoved: function() {},
    onItemVisited: function(){},
    onBeginUpdateBatch: function() {},
    onItemMoved: function(){},
    onBeforeItemRemoved: function(){},
    onBeginUpdateBatch: function() {},
    onEndUpdateBatch: function(){},

    QueryInterface: XPCOMUtils.generateQI([Ci.nsINavBookmarkObserver])
  };
  me.bmsvc.addObserver(me.bookmarkListener, false);
}

SmartMark.prototype.kill = function() {
  let me = this;
  me.bmsvc.removeObserver(me.bookmarkListener);
}

SmartMark.prototype.handleSmartmark = function(aItemId) {
  let me = this;
  Cu.reportError("Handle Smartmark" + aItemId);
  let placeId = me.utils.getData(["fk"], {"id":aItemId}, "moz_bookmarks")[0]["fk"];


  Cu.reportError("place ID is " + placeId);
  let searchTags = me.utils.getSearchTags(placeId);
  Cu.reportError(JSON.stringify(searchTags));
  let tagArray = [];
  for (let k in searchTags) {
    tagArray.push(k);
  }
  let bookmarkURI = me.bmsvc.getBookmarkURI(aItemId);
  me.tagsvc.tagURI(bookmarkURI, tagArray);
};

