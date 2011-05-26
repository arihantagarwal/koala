GandalfAbout = function() {
  let me = this;
  me.actions = {
    clicks: 1,
    scrolls: 2,
    selects: 3,
    moves: 4,
    likes: 5,
    dateset: 6,
  };
  me.scout = new GandalfScout();
  me.utils = new GandalfUtils();
  me.initTags();

  $("a").click(function(e) {
    me.processURL($(this).attr('href'), $(this));
  });

  $("#place-id-button").click(function() {
    let pid = $("#place-id-lookup").val();
    let url = me.utils.getURLFromPID(pid);
    alert(escape(url));
  });

};


GandalfAbout.prototype.initTags = function() {
  let me = this;
  let allTags = me.utils.getAllTags();
  let mainString = "<ul>";
  allTags.forEach(function(tag) {
    mainString += "<li><a href=\"/tag/" + tag + "\">" + tag + "</a></li>";
  });
  mainString += "</ul>";
  document.getElementById("tags").innerHTML = mainString;
};

GandalfAbout.prototype.processSort = function(url) {
  let me = this;
  let hideBookmarked = false;
  if (url.indexOf("/") >= 0) {
   hideBookmarked = true;
  };
  if (hideBookmarked) {
    url = url.split('/')[0];
  }
  let showType = me.actions[url];
  let trackerDict = me.scout.getTrackerDict();
  let resultDiv = document.getElementById("results");
  me.showDict(trackerDict, resultDiv, showType, hideBookmarked);

};

GandalfAbout.prototype.processTag = function(tag, elem) {
  
};

GandalfAbout.prototype.processURL = function(url, elem) {
  let me = this;
  let action = url.split("/")[0];
  let m = {
    "sorted": me.processSort,
    "tags": me.processTag,
  };

  if (action == "sort") {
    me.processSort(url.split('/').slice(1).join('/'));
  } else if (action == "tag") {
    me.processTag(url.split('/').slice(1).join('/'), elem);
  }
};


GandalfAbout.prototype.showDict = function(resDict, resDiv, showType, hideBookmarked) {
  let me = this;
  let sortable = [];
  for (let placeId in resDict) {
    if (resDict[placeId][showType].length > 0) {
      if (hideBookmarked && me.utils.isPIDInBookmarks(placeId)) {
        continue;
      }
      let baseURL = me.utils.getURLFromPID(placeId);
      let srcMap = me.utils.tracebackPID(placeId);
      sortable.push([baseURL, resDict[placeId][showType], srcMap]);
    }
  }
  let sorted = sortable.sort(function(a,b) {return b[1].length - a[1].length;});
  let resString = "<ul>";
  for (let i = 0; i < sorted.length; i++) {
    resString += "<li>" + escape(sorted[i][0]) + ": <br />" + 
                 sorted[i][1] + "<br />" + 
                 JSON.stringify(sorted[i][2]) + "</li>";
  }
  resString += "</ul>";
  resDiv.innerHTML = resString;
};

(function() {
  window.onload = function() {
    console.log("Hello, About");
    Components.utils.reportError("Hello, About");
    var about = new GandalfAbout();
  };
})();
