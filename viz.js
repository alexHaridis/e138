var width = 820, height = 600;

// Define color for the central node
const centralNodeColor = "#1fa040"; 

// Define colors for category nodes
const categoryColors = [
    "#FFB3A7", // Shape Grammars 
    "#85C1E9", // Mathematics -
    "#FAD7A0", // Computer Science 
    "#82E0AA", // Architecture 
    "#F7DC6F", // Literature 
    "#C39BD3", // Artificial Intelligence 
    "#76D7C4", // Cognitive Science 
    "#FF474C", // Aesthetics 
    "#BB8FCE", // Design & Engineering 
    "#7FB3D5"  // Social Science & Technology 
];

// Append SVG to the body
var svg = d3.select("#graph")
.attr("width", width)
.attr("height", height)
.attr("viewBox", [0, 0, width, height])
.attr("preserveAspectRatio", "xMidYMid meet")

// Tooltip for book details
var tooltip = d3.select("body").append("div")
.attr("class", "tooltip")
.style("opacity", 1)
.style("border-color",  "#ffffff")
.style("border", "1px");

// Simulation setup with all forces
var simulation = d3.forceSimulation()
.force("link", d3.forceLink().id(function(d) { return d.id; }).distance(72))
.force("charge", d3.forceManyBody().strength(-80))
.force("center", d3.forceCenter(width / 2, height / 2));

d3.json("ES138-Graph-Data.json").then(function(graph) {
    
    // Initialize visibility for nodes and links. Here I make only central and category nodes visible
    graph.nodes.forEach(node => {
        node.visible = node.group === 0 || node.group === 1; 
    });
    graph.links.forEach(link => {
        // Finding the source and target nodes for each link
         const sourceNode = graph.nodes.find(node => node.id === link.source);
         const targetNode = graph.nodes.find(node => node.id === link.target);
    
        // Making a link visible only if it connects the central node with a category node
        link.visible = (sourceNode.group === 0 && targetNode.group === 1) || (sourceNode.group === 1 && targetNode.group === 0);
    });

    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph.links.filter(link => link.visible))
        .enter().append("line");

    var node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(graph.nodes.filter(node => node.visible))
        .enter().append("g")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));
    
    node.append("circle")
        .attr("r", function(d) { 
            if(d.group === 0) return 13; // Central node, now twice the size
            else if(d.group === 1) return 8; // Category nodes, about the average of big node and book nodes
            else return 5; 
        })
        .attr("fill", function(d) { 
            if(d.group === 0) return centralNodeColor; // Central Node
            else if(d.group === 1) {
                // Using the category ID to assign color
                let catIndex = parseInt(d.id.split("_")[1]) - 1;
                return categoryColors[catIndex];
            } else return "#D3D3D3"; 
        })
        .on("click", clickNode);
        

    // Append text labels to the node groups. when you refer to the json you would notice group 0 for central (course), 1 for categories and 2 for books
    node.append("text")
        .attr("dx", 0)
        .attr("dy", function(d) { 
            return d.group === 0 ? 13 + 15 : d.group === 1 ? 8 + 15 : 5 + 15; 
        })
        .text(function(d) { return d.label.toUpperCase(); })
        .style("font-size", function(d) { 
            return d.group === 0 || d.group === 1 ? "12px" : "11px"; 
        })
    .style("font-weight", function(d) { 
            return d.group === 0 || d.group === 1 ? "bold" : "normal"; 
        })
        .style("text-anchor", "middle");

    // Tooltip for book details
    node.filter(d => d.group === 2) // Only for book nodes
        .on("mouseover", function(event, d) {
            var htmlContent = `<br><hr><br>
                <div style="display: flex; flex-direction: row;">
                    <img src='covers/${d.id}.jpg' style="flex: 50%; width:auto; max-height:240px;"><br>
                    <div style="flex: 50%; padding-left: 10px; text-align: left;">
                        <strong style="font-size: 14px;">${d.title}</strong><br/><br><br>
                        <span style="font-size: 12px;">Authors: ${d.author}</span><br/><br>
                        <span style="font-size: 12px;">Year: ${d.year}</span><br/><br>
                        <span style="font-size: 12px;">Category: ${d.class}</span>
                    </div>
                </div>
                <div style="text-align: left; padding-top: 5px;"><hr><br>
                    ${d.synopsis}
                </div><br><hr>
            `;
            tooltip.html(htmlContent)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px")
                .transition()
                .duration(200)
                .style("opacity", 1)
                .style("border", "1px solid")
                .style("border-color", "#000000");
        })
        .on("mouseout", function() {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });


    simulation
        .nodes(graph.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(graph.links)
        .id(function(d) { return d.id; });

    function ticked() {
        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("y2", function(d) { return d.target.y; });

            node.attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")";
            });
    }

    function clickNode(event, d) {
        if (d.group === 1) { // condition for clicking category node
            graph.links.forEach(link => {
                if (link.source.id === d.id || link.target.id === d.id) {
                    link.visible = true; // Setting the link visibility to true
                    // Finding and setting the connected nodes visibility
                    const connectedNodeId = link.source.id === d.id ? link.target.id : link.source.id;
                    const connectedNode = graph.nodes.find(node => node.id === connectedNodeId);
                    connectedNode.visible = true;
                }
            });
            updateGraph(); // Updating the graph with visibility changes
        }
    }
    
    function updateGraph() {
        // Update the links with new data
        link = svg.select(".links")
                  .selectAll("line")
                  .data(graph.links.filter(d => d.visible), d => d.source.id + "-" + d.target.id);
    
        // Enter any new links and update existing ones
        link = link.enter().append("line")
                    .merge(link)
                    .attr("stroke", "#000000")
                    .attr("stroke-opacity", 1);
    
        // Remove any old links
        link.exit().remove();
    
        // Update the nodes with new data
        node = svg.select(".nodes")
                  .selectAll("g")
                  .data(graph.nodes.filter(d => d.visible), d => d.id);
    
        var nodeEnter = node.enter().append("g")
                                .call(d3.drag()
                                    .on("start", dragstarted)
                                    .on("drag", dragged)
                                    .on("end", dragended));
    
        nodeEnter.append("circle")
                .attr("r", function(d) { 
                    if(d.group === 0) return 13; 
                    else if(d.group === 1) return 8; 
                    else return 5; 
                })
                .attr("fill", function(d) { 
                    if(d.group === 0) return "#1fa040"; 
                    else if(d.group === 1) {
                        let catIndex = parseInt(d.id.split("_")[1]) - 1;
                        return categoryColors[catIndex];
                    } else return "#D3D3D3"; 
                })
                .on("click", clickNode)
                .on("mouseover", mouseover) 
                .on("mouseout", mouseout);

        nodeEnter.append("text")
                 .attr("dx", 0)
                 //.attr("dy", "0.35em")
                 .attr("dy", function(d) { 
                    return d.group === 0 ? 13 + 15 : d.group === 1 ? 8 + 15 : 5 + 15; 
                })
                 .text(function(d) { return d.label.toUpperCase(); })
                 .style("font-size", function(d) { return d.group === 0 || d.group === 1 ? "12px" : "11px"; })
                 .style("font-weight", function(d) { return d.group === 0 || d.group === 1 ? "bold" : "normal"; })
                 .style("text-anchor", "middle");
    
        // Merge enter and update for nodes
        node = nodeEnter.merge(node);
    
        // Apply any specific styling or attributes to the merged node selection
        node.select("circle")
            .attr("r", function(d) { 
                if(d.group === 0) return 13; // Central node
                else if(d.group === 1) return 8; // Category nodes
                else return 5; // Book nodes
            })
            .attr("fill", function(d) { 
                if(d.group === 0) return "#1fa040";
                else if(d.group === 1) {
                    let catIndex = parseInt(d.id.split("_")[1]) - 1;
                    return categoryColors[catIndex];
                } else return "#D3D3D3";
            })
            .on("click", clickNode)
            .on("mouseover", mouseover) 
        .on("mouseout", mouseout);;
    
        node.select("text")
            .style("font-size", function(d) { return d.group === 0 || d.group === 1 ? "12px" : "11px"; })
            .style("font-weight", function(d) { return d.group === 0 || d.group === 1 ? "bold" : "normal"; });
    
        // Remove any old nodes
        node.exit().remove();
    
        // Restart simulation with slightly heated alpha to only adjust new nodes
        simulation.alphaTarget(0.1).restart();
        setTimeout(() => simulation.alphaTarget(0), 2000); // Cool down simulation after short duration
    }       
    
    function mouseover(event, d) {
        if (d.group === 2) { // Show tooltip only for book nodes
            var htmlContent = `<br><hr><br>
                <div style="display: flex; flex-direction: row;">
                    <img src='covers/${d.id}.jpg' style="flex: 50%; width:auto; max-height:240px;"><br>
                    <div style="flex: 50%; padding-left: 10px; text-align: left;">
                        <strong style="font-size: 14px;">${d.title}</strong><br/><br><br>
                        <span style="font-size: 12px;">Authors: ${d.author}</span><br/><br>
                        <span style="font-size: 12px;">Year: ${d.year}</span><br/><br>
                        <span style="font-size: 12px;">Category: ${d.class}</span>
                    </div>
                </div>
                <div style="text-align: left; padding-top: 5px;"><hr><br>
                    ${d.synopsis}
                </div><br><hr>
            `;
            tooltip.html(htmlContent)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px")
                .transition()
                .duration(200)
                .style("opacity", 1)
                .style("border", "1px solid")
                .style("border-color", "#000000");
        }
    }

    function mouseout(event, d) {
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    }

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
});