KoalaUtils = function() {
  let me = this;
  Cu.reportError("koala utils init");
};

KoalaUtils.prototype.getCurrentWindow = function() {
  let me = this;
  let chromeWin = Services.wm.getMostRecentWindow("navigator:browser");
  let win = chromeWin.gBrowser.selectedBrowser.contentWindow;
  return win;
};

KoalaUtils.prototype.getCurrentDocument = function() {
  // TODO : write this method
  return null
};

KoalaUtils.prototype.getCurrentURL = function() {
  return this.getCurrentWindow().location.href;
};

KoalaUtils.prototype.getPlaceIdFromURL = function(url) {
  let me = this;
  let result = this.getData(["id"], {"url" : url}, "moz_places");
  if (result.length == 0) {
    return null;
  } else {
    return result[0]["id"];
  }
};

KoalaUtils.prototype.getData = function(fields, conditions, table) {
  let me = this;
  let queryString = "SELECT ";
  queryString += fields.join(',') + ' FROM ' + table + ' WHERE ';
  let conditionArr = [];
  for (let key in conditions) {
    conditionArr.push(key + " = :" + key + "_v");
  }
  queryString += conditionArr.join(" AND ");
  //Cu.reportError("query string constructed" + queryString);
  let stm = Svc.History.DBConnection.createAsyncStatement(queryString);
  //Cu.reportError("statement created, parametrizing with " + JSON.stringify(conditions));
  for ([k, v] in Iterator(conditions)) {
    //Cu.reportError("adding condition + " + k + " : " + v);
    stm.params[k + "_v"] = v;
  }
  //Cu.reportError("params are" + JSON.stringify(stm.params));
  let ret = [];
  //Cu.reportError("executing statement");
  Utils.queryAsync(stm, fields).forEach(function(row) {
    ret.push(row);
  });
  //Cu.reportError("returing " + JSON.stringify(ret));
  return ret;
};

KoalaUtils.prototype.updateData = function(id, data, table) {
  let queryString = "UPDATE " + table + " SET ";
  for ([k, v] in Iterator(data)) {
    queryString += k + " = :" + k + "_v ";
  }
  queryString += "WHERE id = :id";
  //Cu.reportError(queryString);
  let stm = Svc.History.DBConnection.createAsyncStatement(queryString);
  stm.params["id"] = id;
  for ([k,v] in Iterator(data)) {
    stm.params[k + "_v"] = v;
  }
  Utils.queryAsync(stm, []);
};

KoalaUtils.prototype.insertData = function(data, table) {
  let flatData = [];
  for ([k,v] in Iterator(data)) {
    flatData.push(k);
  }
  let queryString = "INSERT INTO " + table + "(";
  queryString += flatData.join(',');
  queryString += ") VALUES ("
  queryString += flatData.map(function(d) {return ":" + d + "_v";}).join(',');
  queryString += ");";
  //Cu.reportError(queryString);
  let stm = Svc.History.DBConnection.createAsyncStatement(queryString);
  for ([k,v] in Iterator(data)) {
    stm.params[k + "_v"] = v;
  }
  //Cu.reportError(JSON.stringify(stm.params));
  Utils.queryAsync(stm, []);
};

KoalaUtils.prototype.isValidURL = function(url) {
  if (url && url.indexOf("http") > -1) {
    return true;
  }
  return false;
};

KoalaUtils.prototype.getCurrentTime = function(precision) {
  let time = new Date().getTime();
  if (!precision)
    precision = "o";
  return Math.floor({
    "o" : time,
    "s" : time / (1000),
    "m" : time / (1000 * 60),
    "h" : time / (1000 * 60 * 60),
    "d" : time / (1000 * 60 * 60 * 24)
  }[precision]);
};

KoalaUtils.prototype.createDB = function(table, schema) {
  let me = this;
  let dbFile = Cc["@mozilla.org/file/directory_service;1"]
               .getService(Ci.nsIProperties)
               .get("ProfD", Ci.nsIFile);
  dbFile.append("places.sqlite");
  let storage = Cc["@mozilla.org/storage/service;1"]
                .getService(Ci.mozIStorageService);
  let dbConn = storage.openDatabase(dbFile);
  
  Cu.reportError("creating " + table);
  try {
    dbConn.createTable(table, schema);
  } catch (ex) {}
};
