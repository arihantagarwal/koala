/*
 * A simple directed graph library for Javascript
 */

function Graph() {
  let me = this;
  let me.graph = {};
  let me.flip = {};
  let me.prop = {};
};

Graph.prototype.addNode = function(node, properties) {
  let me = this;
  if !(node in me.graph) {
    me.graph[node] = {};
    me.flip[node] = {};
  }
  me.prop[node] = properties;
}

Graph.prototype.addEdge = function(startNode, endNode) {
  // assumes both nodes in the graph
  me.graph[startNode][endNode] = true;
  if (endNode in me.graph[startNode]) {
    me.graph[startNode][endNode] += 1;
    me.flip[endNode][startNode] += 1;
  } else {
    me.graph[startNode][endNode] = 1;
    me.flip[endNode][startNode] = 1;
  }
}

Graph.prototype.getProperties = function(node) {
  return (node in me.prop) ? me.prop[node] : null;
}

Graph.prototype.getOutgoing = function(node) {
  return me.graph[node];
};

Graph.prototype.getIncoming = function(node) {
  return me.flip[node];
}

Graph.prototype.toString = function() {
  return JSON.stringify(me.graph);
}
