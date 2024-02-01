// Width and height for the SVG 
var width = 820, height = 600;
//var width = window.innerWidth, height = window.innerHeight;

// Append SVG to the body
var svg = d3.select("#graph")
.attr("width", width)
.attr("height", height)
.attr("viewBox", [0, 0, width, height]);


// Tooltip for book details
var tooltip = d3.select("body").append("div")
.attr("class", "tooltip")
.style("opacity", 1)
.style("border-color",  "#ffffff")
.style("border", "1px");

// Simulation setup with all forces
var simulation = d3.forceSimulation()
.force("link", d3.forceLink().id(function(d) { return d.id; }).distance(30))
.force("charge", d3.forceManyBody().strength(-80))
.force("center", d3.forceCenter(width / 2, height / 2));

d3.json("ES138-Graph-Data.json").then(function(graph) {
    
    // Initialize visibility for nodes and links
    graph.nodes.forEach(node => {
        node.visible = node.group === 0 || node.group === 1; // Only central and category nodes are visible initially
    });
    graph.links.forEach(link => {
        link.visible = false; // Links are invisible initially
    });

    
    // Filter to show only central and category nodes initially
    var initialNodes = graph.nodes.filter(node => node.group === 0 || node.group === 1);

    // Adjust links to ensure they only include those where both source and target nodes are present
    var initialLinks = graph.links.filter(link => 
        initialNodes.some(node => node.id === link.source) && 
        initialNodes.some(node => node.id === link.target)
    );
    
    

    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter().append("line");

    var node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(graph.nodes)
        .enter().append("g")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));
    
    node.append("circle")
        .attr("r", function(d) { 
            
        return d.group === 0 ? 8 : 5; // Make central node bigger
        })
        .attr("fill", function(d) { 
        return d.group === 0 ? "#505050" : d.group === 1 ? "#36013F" : "#D3D3D3"; 
        });

    // Append text labels to the node groups
    node.append("text")
        .attr("dx", 12)
        .attr("dy", "0.35em")
        .text(function(d) { return d.title; })
        .style("font-size", function(d) { 
            return d.group === 0 || d.group === 1 ? "12px" : "10px"; 
        })
    .style("font-weight", function(d) { 
            return d.group === 0 || d.group === 1 ? "bold" : "normal"; 
        })
        //.style("text-anchor", "middle");
    
    
    initialLinks.forEach(link => {
        const sourceExists = initialNodes.some(node => node.id === link.source);
        const targetExists = initialNodes.some(node => node.id === link.target);
        if (!sourceExists || !targetExists) {
            console.error('Missing node for link: ', link);
        }
    });

    node.filter(d => d.group === 2) // Only for book nodes
        .on("mouseover", function(event, d) {
            tooltip.html(`<strong>${d.title}</strong><br/>${d.author}<br/><img src='covers/${d.id}.jpg' width='100'><br/>${d.synopsis}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px")
                .transition()
                .duration(200)
                .style("opacity", 1)
                .style("border-color", "#00000")
                .style("border", "1px");
        })
        .on("mouseout", function() {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
    
    node.on("click",clickNode);

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
        if (d.group === 1) { // Check if a category node is clicked
            d.expanded = !d.expanded; // Toggle the expanded state

            graph.nodes.forEach(node => {
                if (node.class === d.id && node.group === 2) {
                    node.visible = d.expanded; // Toggle visibility based on the expanded state
                }
            });
            graph.links.forEach(link => {
                if (link.source === d.id || link.target === d.id) {
                    link.visible = d.expanded; // Toggle visibility based on the expanded state
                }
            });

            // Rebind and restart simulation with updated nodes and links
            restartSimulation();
        }
    }

    function restartSimulation() {
        simulation.stop();

        // Update links with visibility
        var link = svg.select(".links").selectAll("line")
            .data(graph.links, function(d) { return d.index; });

        link.exit().remove();
        link.enter().append("line").merge(link)
            .style("display", d => d.visible ? "block" : "none");

        // Update nodes with visibility
        var node = svg.select(".nodes").selectAll("g")
            .data(graph.nodes, function(d) { return d.id; });

        node.exit().remove();
        var nodeEnter = node.enter().append("g");

        nodeEnter.merge(node)
            .style("display", d => d.visible ? "block" : "none");

        nodeEnter.call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))
            .on("click", clickNode);

        nodeEnter.append("circle")
            .attr("r", function(d) { return d.group === 0 ? 8 : 5; })
            .attr("fill", function(d) { return d.group === 0 ? "#505050" : d.group === 1 ? "#36013F" : "#D3D3D3"; });

        nodeEnter.append("text")
            .attr("dx", 12)
            .attr("dy", "0.35em")
            .text(function(d) { return d.title; })
            .style("font-size", function(d) { return d.group === 0 || d.group === 1 ? "12px" : "10px"; })
            .style("font-weight", function(d) { return d.group === 0 || d.group === 1 ? "bold" : "normal"; });

        // Apply updates to circles and texts separately if needed
        // This might involve selecting them within each node group and updating their attributes

        // Restart the simulation
        simulation.nodes(graph.nodes);
        simulation.force("link").links(graph.links);
        simulation.alpha(1).restart();
    }



    function mouseover(event, d) {
        if (d.group === 2) { // Show tooltip only for book nodes
            var imagePath = "covers/" + d.cover; // Prepend the 'covers/' path to the image filename
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
                tooltip.html(d.title + "<br/>" + d.author + "<br/><img src='" + imagePath + "' width='100'/>")
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 28) + "px");
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