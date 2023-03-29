$(window).on('load', function() {
  // This initializes your cytoscape variable. This is where your graph is saved and what you use to make modifications.
  // The styling for the objects within it are specified in style.json
  // all the elements are saved in elements.json
  var cy = cytoscape({ 
    container: document.getElementById('cy'), 
    style: fetch('./style.json').then( res => res.json() ),
    layout: {
      name: 'grid',
      rows: 1
    },
    elements: fetch('./elements.json').then( res => res.json() )
  });

  // Set the default zoom
  cy.zoom(0.5)

  //center the graph on render.
  cy.centre();

  // set the max and min zoom
  cy.maxZoom(3);
  cy.minZoom(0.5);

  // change some defaults for the edge handles extension.
  let defaults = {
    canConnect: function( sourceNode, targetNode ){
    return !sourceNode.same(targetNode); //disallow loops
  },
    edgeParams: function( sourceNode, targetNode ){
      return {};
    },
    hoverDelay: 150, // time spent hovering over a target node before it is considered selected
    snap: true, // when enabled, the edge can be drawn by just moving close to a target node (can be confusing on compound graphs)
    snapThreshold: 0, // the target node must be less than or equal to this many pixels away from the cursor/finger
    snapFrequency: 5, // the number of times per second (Hz) that snap checks done (lower is less expensive)
    noEdgeEventsInDraw: true, // set events:no to edges during draws, prevents mouseouts on compounds
    disableBrowserGestures: true // during an edge drawing gesture, disable browser gestures such as two-finger trackpad swipe and pinch-to-zoom
  };

  // initialize edge handles
  let eh = cy.edgehandles(defaults);

  // when drawing of edge is complete, prompt user for the label of the edge. 
  // Cyto will auto generate an ID.
  cy.on('ehcomplete', (event, sourceNode, targetNode, addedEdge) => {
    var edgeWeight;
    do{
      edgeWeight = prompt("Enter Edge Weight.");
    } while( edgeWeight == "" );

    if(edgeWeight == null){
      // meant to cause error when user presss cancel on the prompt above.
      throw new Error('Edge Creation Cancelled');
    }
    else{
      var iter = addedEdge._private.lazyMap.entries();
      var k;
      for (let e of iter) {
        k = e[0];
      }
      cy.getElementById(k)._private.data.weight = parseInt(edgeWeight);
      cy.getElementById(k).select();
    }
  });


  /*
  Button functions
  */

  // Used for figuring out wheather draw mode was previously enabled. 
  var drawModeOn = false;

  $("#draw-on").on("click", function(){
    if (!drawModeOn){
      eh.enableDrawMode();
      alert("Draw Mode On.");
      drawModeOn = true;
      document.querySelector('#draw-on').textContent = 'Draw Mode Off';
    }
    else{
      eh.disableDrawMode();
      alert("Draw Mode Off.");
      drawModeOn = false;
      document.querySelector('#draw-on').textContent = 'Draw Edges';
    }
  });

  /*
  Gets the name of the new node and adds it to cy. Default spawn positing is set to x: 300, y: 550. Might need to change?
  No two nodes can have the same id, or in this case name. Ie all node names/ids must be unique. 
  Also size of node is dynamic based on the input text length. If the input text length is less than 16 than we only need one line to represent this text. (16 was found through some trail and error :))
  Anything greater than 16 we want to modify the height to fit the node accordingly. We do this by adding in a \n every 16 characters into the string.
  */
  $("#newN").on("click", function(){
    var nodeName;
    do{
      nodeName = prompt("Enter New Edeg Value.");
    } while( nodeName == "" );
    if (nodeName == null){
      return;
    }
    else{
      var newNodeName = "";
      var currentLineLength = 0;
      const textArr = nodeName.split(" ");
      for (let i = 0; i < textArr.length; i++){
        var currentStrLength = textArr[i].length;
        if ((currentStrLength + currentLineLength + 1) <= 16){
          newNodeName += textArr[i] + " ";
          currentLineLength += currentStrLength;
        }
        else{
          newNodeName += "\n" + textArr[i] + " ";
          currentLineLength = 0;
        }
      }
      nodeName = newNodeName;
    }

    try{
      cy.add({
        group: 'nodes',
        data: { id: nodeName},
        position: { 
          x: 300,
          y: 550
        },
        style: {
          width: 75,
          height: 75
        }
      });
    }
    catch(err){
      alert("Node with this name already exists.");
    }
  });

  /*
  Finds the element in cy based of its name.
  Proceeds to delete if it exists.
  Capitals and spaces matter!
  */
  $("#removeNode").on("click", function() {
    $("#reset-algo").trigger('click');
    var nodeName = prompt('Enter Node Name');
    try{
      // need to get the object associated with this name.
      var removeableNode = cy.getElementById(nodeName);
      //remove the object
      cy.remove(removeableNode);
    }
    catch(err){
      alert("Node does not exist.");
    }
  });


  $("#reset-algo").on("click", function() {
    var looper = cy.json();  
    var i;
    for(i in looper.elements.nodes){
      var elementName = '#' + looper.elements.nodes[i].data.id;
      cy.elements(elementName).style({'background-color': "rgb(135,206,250)"});
      // "rgb(153,153,153)"
      cy.elements(elementName).connectedEdges().style({ 'line-color': "rgb(204,204,204)" });
    }
  });


  // global edge to be deleted.
  var tappedEdge;
  cy.on('tap', 'edge', function(evnt){
    tappedEdge = evnt.target._private.data.id;
  });

  $("#editEdge").on("click", function() {
    var editEdge = cy.getElementById(tappedEdge);
    var newEdgeValue;
    do{
      newEdgeValue = prompt("Enter New Edeg Value.");
    } while( newEdgeValue == "" );
    editEdge._private.data.weight = parseInt(newEdgeValue);  
    $('cy').trigger('click');
    //cy.getElementById(tappedEdge).select();
  });

  // now remove most recently clicked edge. Uses variable above to know which one was last clicked.
  $("#removeEdge").on("click", function() {
    cy.remove(cy.getElementById(tappedEdge));
  });

  $("#dijkstra").on("click", function(){ 
    $("#reset-algo").trigger('click');
    var startingNode;
    var endNode;
    do{
      startingNode = prompt("Enter Start Node.");
    } while( startingNode == "" );
    do{
      endNode = prompt("Enter End Node.");
    } while( endNode == "" );
    if (startingNode == null || endNode == null){
      return;
    }
    var nodesMap = makeKeyValue(startingNode);
    var unvisitedNodes = makeUnvisitedArray();
    var visitedNodes = [];
    var parents = [];
    var NO_PARENT = -1;
    // Below makes sure that the first element we will be looping from is our starting node.
    unvisitedNodes.splice(unvisitedNodes.indexOf(startingNode), 1);
    unvisitedNodes.splice(0, 0, startingNode);
    parents[startingNode] = NO_PARENT;
    // algo implamented below
    for (let i = 1; i < unvisitedNodes.length; i++) {
      let pre = -1;
      let min = Number.MAX_SAFE_INTEGER;
      unvisitedNodes.forEach(function (item, index) {
        if (!visitedNodes[item] && nodesMap[item] < min) {
          pre = item;
          min = nodesMap[item];
        }         
      });
      if (pre==-1) {
        return;
      }
      visitedNodes[pre] = true;
      let edges = getNeighbouringEdges('#' + pre);
      for (var e in edges) {
        if (edges[e] > 0 && ((min + edges[e]) < nodesMap[e])) {
          parents[e] = pre;
          nodesMap[e] = min + edges[e];
        }
      }
    }
    var shortestPath = [endNode];
    shortestPath = addPath(parents, shortestPath);
    visualize(shortestPath);
  })

  $("#bellManFord").on("click", function() {
    $("#reset-algo").trigger('click');
    var startingNode;
    var endNode;
    do{
      startingNode = prompt("Enter Start Node.");
    } while( startingNode == "" );
    do{
      endNode = prompt("Enter End Node.");
    } while( endNode == "" );
    if (startingNode == null || endNode == null){
      return;
    }
    var nodesMap = makeKeyValue(startingNode);
    var unvisitedNodes = makeUnvisitedArray();
    // Below makes sure that the first element we will be looping from is our starting node.
    unvisitedNodes.splice(unvisitedNodes.indexOf(startingNode), 1);
    unvisitedNodes.splice(0, 0, startingNode);
    var parents = [];
    var connectedNodes = [];
    // algo implamented below
    for(let i = 0; i < unvisitedNodes.length; i++){
      var edgesOfCurNode = getNeighbouringEdges('#' + unvisitedNodes[i]);
      for (const [key, value] of Object.entries(edgesOfCurNode)) {
        if(nodesMap[unvisitedNodes[i]] + value < nodesMap[key]){
          parents[key] = unvisitedNodes[i];
          nodesMap[key] = nodesMap[unvisitedNodes[i]] + value
        }
      }
    }
    console.log(parents)
    parents[startingNode] = -1;
    var shortestPath = [endNode];
    shortestPath = addPath(parents, shortestPath);
    visualize(shortestPath);
  })

  $("#clear-canvas").on("click", function(){
    var looper = cy.json();  
    var i;
    for(i in looper.elements.nodes){
      var elementName = '#' + looper.elements.nodes[i].data.id;
      cy.remove(elementName);
    }
  })


  /*
  Helper Functions
  */

  /*
  This function returns a key value pair for the graph to be traversed. Key will be the name of the node, the value will be its distance to the start. 
  Initially at starting node the value will be 0 and the rest of the nodes will be set to infinity. 
  */
  function makeKeyValue(startingNode){
    var looper = cy.json();  
    var nodesMap = {[startingNode]: 0};
    var i;
    for(i in looper.elements.nodes){
      var elementName = looper.elements.nodes[i].data.id;
      if ((!(elementName in nodesMap)) && (elementName != startingNode)){
        nodesMap[elementName] = Number.MAX_SAFE_INTEGER;
      }
    }
    return nodesMap;
  }

  /*
  This functions returns a list of all unvisited nodes in the graph. Used for the setup of the algo it will essentially return a list of all the nodes in the graph.
  */
  function makeUnvisitedArray(){
    var looper = cy.json();  
    var unvisitedArray = [];
    var i;
    for(i in looper.elements.nodes){
      var elementName = looper.elements.nodes[i].data.id;
      unvisitedArray.push(elementName);
    }
    return unvisitedArray;
  }

  /*
  This functions returns a dictionary/hash map of {neighbouringEdge: weight} of the current nodes. 
  */
  function getNeighbouringEdges(nodeName){
    var connectedMap = {};
    var edges = cy.$(nodeName).connectedEdges();
    for(let j = 0; j < edges.length; j++){
      var targetNode = edges[j]._private.data.target;
      if(nodeName == '#' + targetNode){
        var targetNode = edges[j]._private.data.source;
      }
      var weight = edges[j]._private.data.weight;
      connectedMap[targetNode] = weight;
    }
    return connectedMap;
  }

  /*
  This functions builds a list of the shortest path from the starting node to end node
  */
  function addPath(parents, path) {
    var parent = parents[path[0]];
    if (parent == -1) {
      return path;
    }
    path.unshift(parent);
    return addPath(parents, path)
  }

  /*
  This function is used to visually represent the Bellman-Ford and Dijkstra's Algo
  */
  function visualize(path){
    var i = 0;
    // first colour in all the nodes
    while (i < path.length){
      var elementName = '#' + path[i];
      cy.elements(elementName).style({ 'background-color': "rgb(223,30,30)" });
      i += 1;
    }
    // next colour in all the edges
    i = 0;
    var j = 1;
    while (i < path.length){
      var elementName = '#' + path[i];
      var edges = cy.elements(elementName).connectedEdges();
      for (let e = 0; e < edges.length; e++){
        var sourceNode = edges[e]._private.data.source;
        var targetNode = edges[e]._private.data.target;
        if ((path[i] == sourceNode && path[j] == targetNode) || (path[j] == sourceNode && path[i] == targetNode)){
          edges[e].style({ 'line-color': "rgb(223,30,30)" }); 
        }
      }
      i += 1;
      j += 1;
    }
  }
  
  function setStartingLocation(nodeName){
    var x = cy.elements("#"+nodeName).position()['x'];
    var y = cy.elements("#"+nodeName).position()['y'];
    cy.elements("#"+nodeName).style({'background-image': '../resources/packet.jpg'})
  }

});

  

