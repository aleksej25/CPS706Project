$(document).ready(function(){

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
      cy.getElementById(k)._private.data.label = edgeWeight;
      cy.getElementById(k).select();
      
    }

  });

  // Button functions

  // Used for figuring out wheather draw mode was previously enabled. 
  var drawModeOn = false;

  $("#draw-on").click(function(){
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
      document.querySelector('#draw-on').textContent = 'Draw Mode On';
    }
  });

  /*
  Gets the name of the new node and adds it to cy. Default spawn positing is set to x: 300, y: 550. Might need to change?
  No two nodes can have the same id, or in this case name. Ie all node names/ids must be unique. 
  Also size of node is dynamic based on the input text length. If the input text length is less than 16 than we only need one line to represent this text. (16 was found through some trail and error :))
  Anything greater than 16 we want to modify the height to fit the node accordingly. We do this by adding in a \n every 16 characters into the string.
  */
  $("#newN").click(function(){
    var nodeName = prompt('Enter Node Name');
    if (nodeName.length <= 16){
      var nodeWidth = 200;
      var nodeHeight =  45;
    }
    else{
      var nodeWidth = 200;
      var roundedNodeLines = Math.round((nodeName.length)/16);
      var nodeHeight =  30 * roundedNodeLines;
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
          width: nodeWidth,
          height: nodeHeight
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
  $("#removeNode").click(function(){
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

  // global edge to be deleted.
  var edgeToDelete;
  cy.on('tap', 'edge', function(evnt){
    edgeToDelete = evnt.target._private.data.id;
  });

  // now remove most recently clicked edge. Uses variable above to know which one was last clicked.
  $("#removeEdge").click(function() {
    var removeableEdge = cy.getElementById(edgeToDelete);
    cy.remove(removeableEdge);
  });

  $("#dijkstra").click(function(){
    var startingNode;
    var endNode;
    do{
      startingNode = prompt("Enter Start Node.");
    } while( startingNode == "" );
    do{
      endNode = prompt("Enter End Node.");
    } while( endNode == "" );
  })

  $("#bellManFord").click(function(){
    var startingNode;
    var endNode;
    do{
      startingNode = prompt("Enter Start Node.");
    } while( startingNode == "" );
    do{
      endNode = prompt("Enter End Node.");
    } while( endNode == "" );
  })
});

