KoalaDashboard = function(doc) {
  let me = this;
  me.doc = doc;
  me.utils = new KoalaUtils();
  me.gc = new GrandCentral();
  me.setupDashboard();
};

KoalaDashboard.prototype.sortSubmit = function(e) {
  let me = this;
  e.preventDefault();
  Cu.reportError("form submit");
  let sortBy = null;
  if (me.doc.getElementById("sort-clicks").checked) {
    sortBy = 1;
  } else {
    sortBy = 2;
  }

  let filterHubs = me.doc.getElementById('sort-filter-hub').checked;
  let filterBookmarks = me.doc.getElementById('sort-filter-bm').checked;

  let sorted = me.getSortedBasic(sortBy, filterHubs, filterBookmarks);
  me.populateResults(true, sorted);
}

KoalaDashboard.prototype.uriLookup = function(e) {
  let me = this;
  Cu.reportError("uri lookup");
  e.preventDefault();
  let pid = parseInt(me.doc.getElementById('uri-from-pid').value);
  let uri = me.utils.getData(["url"],{"id": pid},"moz_places");
  uri = uri.length > 0 ? uri[0]["url"] : null;
  Cu.reportError(uri);
}

KoalaDashboard.prototype.setupDashboard = function() {
  let me = this;
  me.sortWrap = function(e) { me.sortSubmit(e) }
  me.uriLookupWrap = function(e) { me.uriLookup(e) }
  me.doc.getElementById('sorted-form').addEventListener("submit", me.sortWrap, false);
  me.doc.getElementById('uri-lookup-form').addEventListener("submit", me.uriLookupWrap, false);
};

KoalaDashboard.prototype.getSortedOccurences = function(sortBy, accum) {
  let me = this;
  let stm = null;
  if (accum) {
    stm = Svc.History.DBConnection.createAsyncStatement(
      "SELECT *, SUM(count) AS occurances FROM moz_koala " +
      "WHERE type=:sortBy  GROUP BY place_id ORDER BY occurances DESC;");
  } else {
     stm = Svc.History.DBConnection.createAsyncStatement(
      "SELECT *, COUNT(place_id) AS occurances FROM moz_koala " +
      "WHERE type=:sortBy  GROUP BY place_id ORDER BY occurances DESC;");
  }

  stm.params.sortBy = sortBy;
  return Utils.queryAsync(stm, ["place_id", "url", "occurances"]).map(function(place) {
    return [place["place_id"], place["occurances"]];
  });
};

KoalaDashboard.prototype.getSortedBasic = function(sortBy, filterHubs, filterBookmarks) {
  // TODO: click count not accounted for as of now
  let me = this;
  let sorted = me.getSortedOccurences(sortBy, (sortBy == 1 ? true : false)); // use accum for clicks
  if (filterBookmarks) {
    sorted = sorted.filter(function(item) { return !me.utils.isBookmarked(item[0]); });
  }
  if (filterHubs) {
    sorted = sorted.filter(function(item) { return me.gc.isHub(item[0]); });
  }
  return sorted;
}

KoalaDashboard.prototype.clickHandler = function(e) {
  let me = this;
  let params = e.currentTarget.id.split('-');
  let sort = params[0] == "sorted" ? true : false;
  let sortBy = {
    "clicks": 1,
    "activity": 2,
  }[params[1]];
  let filterHubs = params[2] == "hubs" ? true : false;
  let filterBookmarks = params[3] == "ub" ? true : false;
  if (sort) {
    let sorted = me.getSortedBasic(sortBy, filterHubs, filterBookmarks);
    Cu.reportError(JSON.stringify(sorted));
    me.populateResults(sort, sorted);
  }

};

KoalaDashboard.prototype.populateResults = function(sort, sorted) {
  let me = this;
  if (sort) {
    let rdp = new KoalaSortedDisplayer(me.doc);
    for (let i in sorted) {
      let occ = sorted[i][1];
      rdp.addRow(sorted[i][0], occ);
    }
  }
};


KoalaSortedDisplayer = function(doc) {
  let me = this;
  me.utils = new KoalaUtils();
  me.doc = doc;
  

  me.resElem = me.doc.getElementById("results");
  me.resElem.innerHTML = "<ol id='sorted-list'></ol>";
  me.list = me.doc.getElementById("sorted-list");
}

KoalaSortedDisplayer.prototype.addRow = function(url, occ) {
  let me = this;
  let li = me.doc.createElement("li");
  li.innerHTML = url + " | " + occ;
  let currentElems = me.list.getElementsByTagName("li");
  me.list.insertBefore(li, currentElems[currentElems.length]);
};
