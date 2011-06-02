KoalaDashboard = function(doc) {
  let me = this;
  me.doc = doc;
  me.utils = new KoalaUtils();
  me.brainiac = new Brainiac();
  me.sc = new SiteCentral();
  me.setupDashboard();
};

KoalaDashboard.prototype.setupDashboard = function() {
  let me = this;
  
  me.optionsWrap = function(e) { me.optionsSubmit(e) }
  me.doc.getElementById('options-form').addEventListener(
    "submit", me.optionsWrap, false);

  /*
  me.sortWrap = function(e) { me.sortSubmit(e) }
  me.uriLookupWrap = function(e) { me.uriLookup(e) }
  me.siteCentralWrap = function(e) { me.siteCentral(e) }
  me.activityWrap = function(e) { me.activityLookup(e) }

  me.doc.getElementById('sorted-form').addEventListener("submit", me.sortWrap, false);
  me.doc.getElementById('uri-lookup-form').addEventListener("submit", me.uriLookupWrap, false);
  me.doc.getElementById('site-hub-form').addEventListener("submit", me.siteCentralWrap, false);
  me.doc.getElementById('act-form').addEventListener("submit", me.activityWrap, false);
  */
};

KoalaDashboard.prototype.optionsSubmit = function(e) {
  let me = this;
  e.preventDefault();
  function $(id) me.doc.getElementById(id)
  
  let sortBy = null;
  if ($('sort-clicks').checked) {
    sortBy = 'clicks';
  } else if ($('sort-activity').checked) {
    sortBy = 'activity';
  } else if ($('sort-perm').checked) {
    sortBy = 'perm';
  }
  
  let hubFilter = $('sort-filter-hub').checked;
  let bmFilter = $('sort-filter-bm').checked;

  let clickCutoff = $('sort-cut-clicks').value ? $('sort-cut-clicks').value : 0.0;
  let activityCutoff = $('sort-cut-act').value ? $('sort-cut-act').value : 0.0;
  let permCutoff = $('sort-cut-perm').value ? $('sort-cut-perm').value : 0.0;

  let startTime = parseInt($('start-time-hidden').value) / (1000 * 60 * 60);
  let endTime = parseInt($('end-time-hidden').value) / (1000 * 60 * 60);
  
  let clickQ = "SELECT place_id, SUM(count) as occ FROM moz_koala " + 
               "WHERE time <= :endTime AND time >= :startTime " + 
               "AND type=1 GROUP BY place_id " +
               "ORDER BY occ DESC;";
  let clickP = {
    "startTime": startTime,
    "endTime"  : endTime
  };

  let activityQ = "SELECT place_id, SUM(count) as occ FROM moz_koala " + 
                  "WHERE time <= :endTime AND time >= :startTime AND type=2 " + 
                  "GROUP BY place_id ORDER BY occ DESC";
  let activityP = clickP;

  let frecencyQ = "SELECT id as place_id, frecency as occ " +
                  "FROM moz_places ORDER BY occ DESC";
  let frecencyP = {};

  let permQ = "SELECT place_id, (time/24) as date, " + 
              "(COUNT(1) / ((:endTime - :startTime)/(CAST(24 AS FLOAT)))) as occ " + 
              "FROM moz_koala WHERE time >= :startTime AND time <= :endTime " + 
              "AND type=2 GROUP BY place_id ORDER BY occ DESC";
  let permP = clickP;
  
  let data = null;
  if (sortBy == 'clicks') {
    data = me.utils.getDataQuery(clickQ, clickP, ["place_id", "occ"]);
  } else if (sortBy == 'activity') {
    data = me.utils.getDataQuery(activityQ, activityP, ["place_id", "occ"]);
  } else if (sortBy == 'perm') {
    data = me.utils.getDataQuery(permQ, permP, ["place_id", "occ"]);
  } else {
    data = me.utils.getDataQuery(frecencyQ, frecencyP, ["place_id", "occ"]);
  }

  
  let rdp = new KoalaSortedDisplayer(me.doc);
  rdp.addRow("Place ID", "Count", "Bookmark Conf");
  
  // TODO: these can be even faster if done in SQL in the original above.
  data.filter(function(d) {
    return hubFilter ? me.sc.isSiteHub(d["place_id"]) : true;
  }).filter(function(d) {
    return bmFilter ? !me.utils.isBookmarked(d["place_id"]) : true;
  }).map(function(d) {
    let uri = me.utils.getData(["url"],{"id": d["place_id"]},"moz_places");
    uri = uri.length > 0 ? uri[0]["url"] : null;
    return [uri, d["occ"], me.brainiac.classify(d["place_id"])];
  }).filter(function(a) {
    return a[0] != null;
  }).forEach(function(a) {
    rdp.addRow(a[0].slice(0,50), a[1], a[2]);
  });

}

KoalaDashboard.prototype.activityLookup = function(e) {
  let me = this;
  e.preventDefault();
  
  let placeId = parseInt(me.doc.getElementById('act-place-id').value);


  let precision = null;
  if (me.doc.getElementById('act-hours').checked) {
    precision = 'h';
  } else if (me.doc.getElementById('act-days').checked) {
    precision = 'd';
  } else if (me.doc.getElementById('act-weeks').checked) {
    precision = 'w';
  } else if (me.doc.getElementById('act-months').checked)  {
    precision = 'm';
  } else {
    precision = 'd';
  }
  reportError(precision);
  let n = parseInt(me.doc.getElementById('act-n').value);
  let start = me.doc.getElementById('act-start').value ? me.doc.getElementById('act-start').value : me.utils.getCurrentTime(precision);

  Cu.reportError(me.utils.getProportionDays(placeId, n, precision, start));

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
  let pCut = me.doc.getElementById("sort-cut").value ? parseFloat(me.doc.getElementById("sort-cut").value) : 0.3;
  let sorted = me.getSortedBasic(sortBy, filterHubs, filterBookmarks);
  sorted = sorted.map(function(a) {
    let pid = a[2];
    let n = 10;
    let prec = 'd';
    let start = me.utils.getCurrentTime(prec);
    let perm = me.utils.getProportionDays(pid, n, prec, start);
    return [a[0],a[1],perm];
  }).filter(function(a) {
    return (a[2] > pCut);
  });
  me.populateResults(true, sorted);
}

KoalaDashboard.prototype.uriLookup = function(e) {
  let me = this;
  //reportError("uri lookup");
  e.preventDefault();
  let pid = parseInt(me.doc.getElementById('uri-from-pid').value);
  let uri = me.utils.getdata(["url"],{"id": pid},"moz_places");
  uri = uri.length > 0 ? uri[0]["url"] : null;
  let rdp = new KoalaSortedDisplayer(me.doc);
  rdp.addRow("URL");
  rdp.addRow(uri);
}

KoalaDashboard.prototype.siteCentral = function(e) {
  let me = this;
  e.preventDefault();
  let placeId = parseInt(me.doc.getElementById('hub-place-id').value);
  me.populateResults(true, me.sc.getSiteHubList(placeId));
}

KoalaDashboard.prototype.getSortedOccurences = function(sortBy, accum) {
  let me = this;
  let stm = null;
  if (accum) {
    let query = "SELECT place_id, SUM(count) as activity FROM moz_koala WHERE type=2 GROUP BY place_id ORDER BY activity DESC LIMIT 100;";
    return me.utils.getDataQuery(query, {}, ["place_id", "activity"]).map(function(d) {
      return [d["place_id"],d["activity"]];
    });
  } else {
    let query = "SELECT place_id, SUM(count) as clicks FROM moz_koala WHERE type=1 GROUP BY place_id ORDER BY clicks DESC LIMIT 100;";
    return me.utils.getDataQuery(query, {}, ["place_id", "clicks"]).map(function(d) {
      return [d["place_id"],d["clicks"]];
    });

  }
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
    return [uri, s[1], s[0]];
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
    rdp.addRow("Place ID", "Occurrences","Permanance");
    for (let i in sorted) {
      rdp.addRow(sorted[i][0], sorted[i][1], sorted[i][2]);
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

