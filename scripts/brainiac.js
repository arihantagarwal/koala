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

/* use bookmarks as training data */
Brainiac.prototype.trainBookmarks = function() {
  let me = this;
  reportError("training brainiac");
  
  me.classParams = ["days", "visit_count", "frecency", "url_depth", "a_activity", "a_clicks"]

  let bookmarkQ = "SELECT p.id as id,COUNT(DISTINCT k.time / 24) as days, " + 
    "b.title,p.visit_count, p.frecency, " + 
    "length(p.url) - length(REPLACE(p.url, '/', '')) - 3 as url_depth " + 
    ",SUM(CASE WHEN k.type=2 THEN k.count ELSE 0 END)" + 
    "/COUNT(DISTINCT k.time / 24) as a_activity, " + 
    "SUM(CASE WHEN k.type=1 THEN k.count ELSE 0 END)/" + 
    "COUNT(DISTINCT k.time / 24) as a_clicks " + 
    "FROM moz_places p, moz_bookmarks b, moz_koala k WHERE b.fk = p.id AND " + 
    "p.id = k.place_id AND b.type = 1 AND b.position > 1 " + 
    "AND p.last_visit_date > 0 AND LENGTH(b.title) > 0 " + 
    "GROUP BY (p.id)";
  let bookmarkData = me.utils.getDataQuery(bookmarkQ, {},
    me.classParams);
  bookmarkData = bookmarkData.map(function(d) { 
    return {
      input: d,
      output: [1]
    }
  });

  let unbookmarkQ = "SELECT p.id,COUNT(DISTINCT k.time/24) as days, " + 
    "p.title, p.visit_count,p.frecency," + 
    "length(p.url) - length(REPLACE(p.url, '/', '')) - 3 as url_depth" + 
    ",SUM(CASE WHEN k.type=2 THEN k.count ELSE 0 END)/COUNT(DISTINCT k.time / 24) as a_activity, " + 
    "SUM(CASE WHEN k.type=1 THEN k.count ELSE 0 END)/COUNT(DISTINCT k.time / 24) as a_clicks " + 
    "FROM moz_places p, moz_koala k " + 
    "WHERE NOT EXISTS(SELECT * FROM moz_bookmarks b WHERE b.fk = p.id) " + 
    "AND p.id = k.place_id AND length(p.title) > 0 " + 
    "AND p.last_visit_date > 0 GROUP BY (p.id) LIMIT :lim";
  let unbookmarkData = me.utils.getDataQuery(unbookmarkQ, {
    "lim" : 1 * bookmarkData.length
  }, me.classParams);
  unbookmarkData = unbookmarkData.map(function(d) { 
      return {
        input: d,
        output: [0]
      }
    })
  let data = bookmarkData.concat(unbookmarkData);
  let stats = brain.crossValidate(brain.NeuralNetwork, {}, data, 4);
  reportError(JSON.stringify(stats));
}

Brainiac.prototype.classify = function(placeId) {
  let me = this;
  let classifyQ = "SELECT p.id,COUNT(DISTINCT k.time/24) as days, " + 
    "p.title, p.visit_count,p.frecency," + 
    "length(p.url) - length(REPLACE(p.url, '/', '')) - 3 as url_depth" + 
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
  let result = me.net.run(inp);
  reportError(JSON.stringify(result));
  if (result.length == 0) {
    return -1;
  }
  return result[0];
}


