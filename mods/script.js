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
  $("#createNewNode").on("click", function(){
    var nodeType;
    const validInputs = ["S", "R", "C"];
    do{
      nodeType = prompt("Enter Node Type. S = Server, C = Client, R = Router.");
    } while( nodeType == "" );
    var nodeName;
    do{
      nodeName = prompt("Enter New Node Name.");
    } while( nodeName == "" );
    if (nodeName == null || nodeType == null){
      return;
    }
    if (! validInputs.includes(nodeType)){
      alert("Invalid Node Type!");
      return;
    }
    try{
      if (nodeType == 'S'){
        cy.add({
          group: 'nodes',
          data: { id: nodeName},
          position: { 
            x: 300,
            y: 550
          },
          style: {
            width: 150,
            height: 150,
            "background-image": "../resources/server.png"
          }
        });
      }
      else if (nodeType == 'C'){
        cy.add({
          group: 'nodes',
          data: { id: nodeName},
          position: { 
            x: 300,
            y: 550
          },
          style: {
            width: 160,
            height: 160,
            "background-image": "../resources/computer.png",
            color: "Black"
          }
        });
      }
      else{
        cy.add({
          group: 'nodes',
          data: { id: nodeName},
          position: { 
            x: 300,
            y: 550
          },
          style: {
            width: 150,
            height: 150,
          }
        });
      }
      
    }
    catch(err){
      alert("Node with this name already exists!");
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

  /*
  Function used to reset the drawing of the algorithm on screen.
  */
  $("#reset-algo").on("click", function() {
    var looper = cy.json();  
    document.getElementById('routingTable').innerHTML = "";
    var i;
    for(i in looper.elements.nodes){
      var elementName = '#' + looper.elements.nodes[i].data.id;
      cy.elements(elementName).style({'background-color': "White"});
      cy.elements(elementName).connectedEdges().style({ 'line-color': "rgb(204,204,204)" });
    }
  });

  // Delay function to highlight edges on and off
  function delay(counter) {
    return new Promise((resolve) => setTimeout(function () {
        highlightEdges(counter);
        resolve();
    }, 500))
  }

  function highlightEdges(counter) {
    var edges = getEdges();
    for (let e = 0; e < edges.length; e++){
      if (counter % 2 == 0) {
        edges[e].style({ 'line-color': "rgb(223,30,30)" });  
      }
      else {
        edges[e].style({ 'line-color': "rgb(204,204,204)" });  
      }
    }   
  }

  // global edge to be updated.
  var tappedEdge;
  cy.on('tap', 'edge', function(evnt){
    tappedEdge = evnt.target._private.data.id;
  });


  /*
  Two functions used below are for editing edges of the algorithm.
  */
  $("#editEdge").on("click", async function() {
    alert("Please select an edge");
    var counter = 0;
    while(tappedEdge == undefined) {
     await delay(counter);
     counter += 1;
    }
    if (tappedEdge != undefined) {  highlightEdges(1);    }
    var editEdge = cy.getElementById(tappedEdge);
    var newEdgeValue;
    do{
      newEdgeValue = prompt("You've chosen edge " + tappedEdge + ". Enter New Edge Value:");
    } while( newEdgeValue == "" );
    editEdge._private.data.weight = parseInt(newEdgeValue);  
    alert("Edge " + tappedEdge + " will be updated.")
    tappedEdge = undefined;
  });

  $("#removeEdge").on("click", async function() {
    alert("Please select an edge to delete");
    var counter = 0;
    while(tappedEdge == undefined) {
     await delay(counter);
     counter += 1;
    }
    if (tappedEdge != undefined) {
      highlightEdges(1);
    }
    cy.remove(cy.getElementById(tappedEdge));
    alert("Edge " + tappedEdge + " will be deleted.");
    tappedEdge = undefined;
  });
  
  /*
  This is a helper function used to pause the for loop execution to visualize the nodes map table.
  */
  function tempPause(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  

  $("#dijkstra").on("click", async function(){ 
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
    document.getElementById("routingTable").style.visibility = "visible";
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
          document.getElementById('routingTable').innerHTML += '<li>' + "From &nbsp &nbsp &nbsp to &nbsp &nbsp &nbsp Cost" + '</li>';
          document.getElementById('routingTable').innerHTML +=  "&nbsp &nbsp" + parents[e] +"&nbsp &nbsp &nbsp &nbsp &nbsp &nbsp" + e + '&nbsp &nbsp  &nbsp &nbsp &nbsp  ' + nodesMap[e];
          await tempPause(1000);
        }
        
      }
    }
    var shortestPath = [endNode];
    shortestPath = addPath(parents, shortestPath);
    visualize(shortestPath);
  })

  $("#bellManFord").on("click", async function() {
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
    document.getElementById("routingTable").style.visibility = "visible";
    var parents = [];
    for(let i = 0; i < unvisitedNodes.length; i++){
      var edgesOfCurNode = getNeighbouringEdges('#' + unvisitedNodes[i]);
      for (const [key, value] of Object.entries(edgesOfCurNode)) {
        if(nodesMap[unvisitedNodes[i]] + value < nodesMap[key]){
          parents[key] = unvisitedNodes[i];
          nodesMap[key] = nodesMap[unvisitedNodes[i]] + value;
          document.getElementById('routingTable').innerHTML += '<li>' + "From &nbsp &nbsp &nbsp to &nbsp &nbsp &nbsp Cost" + '</li>';
          document.getElementById('routingTable').innerHTML +=  "&nbsp &nbsp" + parents[key] +"&nbsp &nbsp &nbsp &nbsp &nbsp &nbsp" + key + '&nbsp &nbsp  &nbsp &nbsp &nbsp  ' + nodesMap[key];
          await tempPause(1000);
        }
      }
    }

    parents[startingNode] = -1;
    var shortestPath = [endNode];
    shortestPath = addPath(parents, shortestPath);
    visualize(shortestPath);
  })

 /*
  Function used to clear the entire graph.
  */
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
  async function visualize(path){
    let start = Date.now(); 
    var i = 0;
    var j = 1;
    // colour in all the nodes and edges
    // Outer loops colours the node inner loops colours the edge
    while (i < path.length){
      var elementName = '#' + path[i];
      cy.elements(elementName).style({ 'background-color': "rgb(223,30,30)" });
      var edges = cy.elements(elementName).connectedEdges();
      for (let e = 0; e < edges.length; e++){
        var sourceNode = edges[e]._private.data.source;
        var targetNode = edges[e]._private.data.target;
        if ((path[i] == sourceNode && path[j] == targetNode) || (path[j] == sourceNode && path[i] == targetNode)){
          await tempPause(1500);
          edges[e].style({ 'line-color': "rgb(223,30,30)" }); 
        } 
      }
      i += 1;
      j += 1;
    }
  }


  /*
  This function is used to return a list of all the current edges
  */
  function getEdges() {
    var nodes = [];
    var looper = cy.json();  
    var i;
    var edges;
    var edgesList = [];
    for(i in looper.elements.nodes){
      nodes.push(looper.elements.nodes[i].data.id);
    }
    i = 0;
    while (i < nodes.length){
      var elementName = '#' + nodes[i];
      edges = cy.elements(elementName).connectedEdges();
      for (let e = 0; e < edges.length; e++){
        edgesList.push(edges[e]);
      }
      i += 1;
    }
    return edgesList;
  }
});


  

