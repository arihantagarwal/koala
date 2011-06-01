KoalaDashboard = function(doc) {
  let me = this;
  me.doc = doc;
  me.utils = new KoalaUtils();
  me.sc = new SiteCentral();
  me.setupDashboard();
};

KoalaDashboard.prototype.sortSubmit = function(e) {
  let me = this;
  e.preventDefault();
  //reportError("form submit");
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
  //reportError("uri lookup");
  e.preventDefault();
  let pid = parseInt(me.doc.getElementById('uri-from-pid').value);
  let uri = me.utils.getData(["url"],{"id": pid},"moz_places");
  uri = uri.length > 0 ? uri[0]["url"] : null;
  let rdp = new KoalaSortedDisplayer(me.doc);
  rdp.addRow("URL", "One");
  rdp.addRow(uri, 1);
}

KoalaDashboard.prototype.siteCentral = function(e) {
  let me = this;
  e.preventDefault();
  let placeId = parseInt(me.doc.getElementById('hub-place-id').value);
  me.populateResults(true, me.sc.getSiteHubList(placeId));
}


KoalaDashboard.prototype.setupDashboard = function() {
  let me = this;
  me.sortWrap = function(e) { me.sortSubmit(e) }
  me.uriLookupWrap = function(e) { me.uriLookup(e) }
  me.siteCentralWrap = function(e) { me.siteCentral(e) }
  me.doc.getElementById('sorted-form').addEventListener("submit", me.sortWrap, false);
  me.doc.getElementById('uri-lookup-form').addEventListener("submit", me.uriLookupWrap, false);
  me.doc.getElementById('site-hub-form').addEventListener("submit", me.siteCentralWrap, false);
};

KoalaDashboard.prototype.getSortedOccurences = function(sortBy, accum) {
  let me = this;
  let stm = null;
  if (accum) {
    stm = Svc.History.DBConnection.createAsyncStatement(
      "SELECT *, SUM(count) AS occurrences FROM moz_koala " +
      "WHERE type=:sortBy  GROUP BY place_id ORDER BY occurrences DESC;");
  } else {
     stm = Svc.History.DBConnection.createAsyncStatement(
      "SELECT *, COUNT(place_id) AS occurrences FROM moz_koala " +
      "WHERE type=:sortBy  GROUP BY place_id ORDER BY occurrences DESC;");
  }

  stm.params.sortBy = sortBy;
  return Utils.queryAsync(stm, ["place_id", "url", "occurrences"]).map(function(place) {
    return [place["place_id"], place["occurrences"]];
  });
};

KoalaDashboard.prototype.getSortedBasic = function(sortBy, filterHubs, filterBookmarks) {
  let me = this;
  let sorted = me.getSortedOccurences(sortBy, (sortBy == 1 ? true : false)); // use accum for clicks
  if (filterBookmarks) {
    sorted = sorted.filter(function(item) { return !me.utils.isBookmarked(item[0]); });
  }
  if (filterHubs) {
  // TODO: use siteHub to filter this
    sorted = sorted.filter(function(item) { return me.sc.isSiteHub(item[0]); });
  }
  
  sorted = sorted.map(function(s) {
    //reportError(JSON.stringify(s));
    let uri = me.utils.getData(["url"],{"id": s[0]},"moz_places");
    uri = uri.length > 0 ? uri[0]["url"]: null;
    //reportError(uri);
    return [uri, s[1]];
  }).filter(function(s) {
    return s[0] != null;
  });
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
    //reportError(JSON.stringify(sorted));
    me.populateResults(sort, sorted);
  }

};

KoalaDashboard.prototype.populateResults = function(sort, sorted) {
  let me = this;
  if (sort) {
    let rdp = new KoalaSortedDisplayer(me.doc);
    rdp.addRow("Place ID", "Occurrences");
    for (let i in sorted) {
      rdp.addRow(sorted[i][0], sorted[i][1]);
    }
  }
};


KoalaSortedDisplayer = function(doc) {
  let me = this;
  me.utils = new KoalaUtils();
  me.doc = doc;
  

  me.resElem = me.doc.getElementById("results");
  me.resElem.innerHTML = "<table id='result-table'></table>";
  me.table = me.doc.getElementById("result-table");
}

KoalaSortedDisplayer.prototype.addRow = function() {
  let me = this;
  let tr = me.doc.createElement("tr");
  let arg = [];
  for (let i = 0; i < arguments.length; i++) {
    arg.push(arguments[i]);
  }
  tr.innerHTML = arg.map(function(e) {
    return "<td>" + e + "</td>";
  }).join('');
  let currentElems = me.table.getElementsByTagName("tr");
  me.table.insertBefore(tr, currentElems[currentElems.length]);
};

