/*
 * Brainiac is a classifier that tries to detect if a site
 * is interesting based on parameters. It uses bookmarks as
 * training data.
 *
 * This is initially based on neural networks from the brain
 * library.
 */


function Brainiac() {
  let me = this;
  me.net = new brain.NeuralNetwork();
  me.utils = new KoalaUtils();
  me.trainBookmarks();
}

Brainiac.prototype.marginalReturnsFunction = function(m) {
  let c = -m / (Math.log(0.5));
  let f = function(x) { return Math.exp(-x / c) }
  return f;
}

/* use bookmarks as training data */
Brainiac.prototype.trainBookmarks = function() {
  let me = this;
  reportError("training brainiac");
  
  me.classParams = [ "frecency", "url_depth", "a_activity", "a_clicks"]
  
  let bookmarkQ = "SELECT p.id as id,COUNT(DISTINCT k.time / 24) as days, " + 
    "b.title,p.visit_count, p.frecency, " + 
    "length(p.url) - length(REPLACE(p.url, '/', '')) - 2 as url_depth " + 
    ",SUM(CASE WHEN k.type=2 THEN k.count ELSE 0 END)" + 
    "/COUNT(DISTINCT k.time / 24) as a_activity, " + 
    "SUM(CASE WHEN k.type=1 THEN k.count ELSE 0 END)/" + 
    "COUNT(DISTINCT k.time / 24) as a_clicks " + 
    "FROM moz_places p, moz_bookmarks b, moz_koala k WHERE b.fk = p.id AND " + 
    "p.id = k.place_id AND b.type = 1 AND b.position > 1 " + 
    "AND p.last_visit_date > 0 AND LENGTH(b.title) > 0 " + 
    "GROUP BY (p.id) LIMIT 15";
  let bookmarkData = me.utils.getDataQuery(bookmarkQ, {},
    me.classParams);
  reportError("have pos data");
  bookmarkData = bookmarkData.map(function(d) { 
    return {
      input: d,
      output: [1]
    }
  });
  reportError("mapped pos data");

  let unbookmarkQ = "SELECT p.id,COUNT(DISTINCT k.time/24) as days, " + 
    "p.title, p.visit_count,p.frecency," + 
    "length(p.url) - length(REPLACE(p.url, '/', '')) - 2 as url_depth" + 
    ",SUM(CASE WHEN k.type=2 THEN k.count ELSE 0 END)/COUNT(DISTINCT k.time / 24) as a_activity, " + 
    "SUM(CASE WHEN k.type=1 THEN k.count ELSE 0 END)/COUNT(DISTINCT k.time / 24) as a_clicks " + 
    "FROM moz_places p, moz_koala k " + 
    "WHERE NOT EXISTS(SELECT * FROM moz_bookmarks b WHERE b.fk = p.id) " + 
    "AND p.id = k.place_id AND length(p.title) > 0 " + 
    "AND p.last_visit_date > 0 GROUP BY (p.id) LIMIT :lim";
  let unbookmarkData = me.utils.getDataQuery(unbookmarkQ, {
    "lim" : 1 * bookmarkData.length
  }, me.classParams);
  reportError("got neg data");
  unbookmarkData = unbookmarkData.map(function(d) { 
    return {
     input: d,
     output: [0]
    }
  });


  
  function normalizeData (allData, removeZero) {
    reportError(JSON.stringify(allData));
    reportError(JSON.stringify(allData["row"]));
    let totalDict = {};
    let totalCount = {};
    for (let row in allData) {
      for (let k in allData[row]["input"]) {
        if (!(k in totalDict)) {
          totalDict[k] = allData[row]["input"][k];
          totalCount[k] = 1;
        } else {
          totalDict[k] += allData[row]["input"][k];
          totalCount[k] += (removeZero && allData[row]["input"][k] == 0) ? 0 : 1;
        }
      }
    }
    reportError("ttotal, count" + JSON.stringify(totalDict) + JSON.stringify(totalCount));
    me.avgDict = {};
    for (let k in totalDict) {
      let avg = totalDict[k] / totalCount[k];
      let marginalFunction = me.marginalReturnsFunction(avg);
      me.avgDict[k] = marginalFunction;
    }
  
  for (let row in allData) {
    for (let k in allData[row]["input"]) {
      allData[row]["input"][k] = me.avgDict[k](allData[row]["input"][k]);
    }
  }
  reportError("normizelied: " + JSON.stringify(allData))
  return allData;
  };
  
  reportError("mapped neg data");
  let data = bookmarkData.concat(unbookmarkData);
  try {
  data = normalizeData(data, true);
  } catch (ex) {reportError(ex)}
  reportError("have data, will train" + JSON.stringify(data));
  me.net.train(data);
  reportError("cross-avlidating");
  let stats = brain.crossValidate(brain.NeuralNetwork, {}, data, 4);
  reportError("trained");
  reportError(JSON.stringify(stats));
}

Brainiac.prototype.classify = function(placeId) {
  let me = this;
  let classifyQ = "SELECT p.id,COUNT(DISTINCT k.time/24) as days, " + 
    "p.title, p.visit_count,p.frecency," + 
    "length(p.url) - length(REPLACE(p.url, '/', '')) - 2 as url_depth" + 
    ",SUM(CASE WHEN k.type=2 THEN k.count ELSE 0 END)/COUNT(DISTINCT k.time / 24) as a_activity, " + 
    "SUM(CASE WHEN k.type=1 THEN k.count ELSE 0 END)/COUNT(DISTINCT k.time / 24) as a_clicks " + 
    "FROM moz_places p, moz_koala k " + 
    "WHERE p.id = k.place_id AND length(p.title) > 0 " + 
    "AND p.id = :placeId " +
    "AND p.last_visit_date > 0 GROUP BY (p.id);";
  
  let params = {
    "placeId" : placeId
  }
  
  let inp = me.utils.getDataQuery(classifyQ, params, me.classParams);
  if (inp.length == 0) {
    return -1;
  } else {
    inp = inp[0];
  }
  for (let k in inp) {
    inp[k] = me.avgDict[k](inp[k]);
  }
  reportError(JSON.stringify(inp));
  let result = me.net.run(inp);
  reportError(JSON.stringify(result));
  if (result.length == 0) {
    return -1;
  }
  return result[0];
}


