console.log("Session ID is: " + sessionId);
document.body.style.backgroundColor = "#FFFFCA";
document.getElementById("statsGraph").style.backgroundColor = "#FFFFCA";

var margin = {
        top: 20,
        right: 20,
        bottom: 30,
        left: 40
    },
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

/* 
 * value accessor - returns the value to encode for a given data object.
 * scale - maps value to a visual display encoding, such as a pixel position.
 * map function - maps from data value to display value
 * axis - sets up axis
 */

// d3.csv("/stats/text.csv", function(error, data) {}
var counter = 0;
d3.json("/api/" + sessionId, function(data) {
    // setup x 
    var timeFormat = d3.time.format("%I:%M %p %a %Y");
    var xValue = function(d) {
            return d.timestamp;
        }, // data -> value
        xScale = d3.scale.linear().range([0,width]), // value -> display
        xMap = function(d) {
            return xScale((d.timestamp));
        }, // data -> display
        xAxis = d3.svg.axis().scale(xScale).orient("bottom")
        .ticks(25)
        .tickPadding(5)
        .tickFormat(function(d) {
            return d3.time.format('%I:%M ')(new Date(d));
        });
    // setup y
    var yValue = function(d) {
          return d.noteName;
        }, // data -> value
        yScale = d3.scale.linear().range([height, 0]), // value -> display
        yMap = function(d) {
           return yScale(d.noteName);
        }, // data -> display
        yAxis = d3.svg.axis().scale(yScale).orient("left");

    // setup fill color
    var cValue = function(d) {
            return d.team;
        },
        color = d3.scale.category10();

    // add the graph canvas to the body of the webpage
    var svg = d3.select("#statsGraph").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom + 50)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")


    // add the tooltip area to the webpage
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // change string (from CSV) into number format
    // data.forEach(function(d) {
    //     d.timestamp = +d.timestamp;
        
    // });
    console.log();
    
    // don't want dots overlapping axis, so add in buffer to data domain
    xScale.domain([d3.min(data, xValue) , d3.max(data, xValue) ]);
    yScale.domain([d3.min(data, yValue) , Math.max.apply(Math,data.map(function(o){return o.noteName;}))]);

    // x-axis
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)")
        .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("Time")


    // y-axis
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Total Notes");

    // draw dots
    svg.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", 8)
        .attr("cx", xMap)
        // .attr("cy", d3.max(data, yValue))
        // .transition()
        // .duration(2000)
        .attr("cy", yMap)
        .style("fill", function(d) {
            return color(cValue(d));
        })
        // .style("stroke", "none")
        .style("stroke-opacity", 0.2)
        .attr('fill-opacity', 0.3)
        .on("mouseover", function(d) {
            console.log(d);
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html("Team: "+ d.team + "<br/> Posted on: " + d3.time.format('%I:%M:%S ')(new Date(d.timestamp)))
                .style("left", (d3.event.pageX + 5) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // draw legend
    var legend = svg.selectAll(".legend")
        .data(color.domain())
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) {
            return "translate(0," + i * 20 + ")";
        });

    // draw legend colored rectangles
    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

    // draw legend text
    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) {
            return d;
        })


});