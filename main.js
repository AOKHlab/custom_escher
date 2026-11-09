const random_seed = 42;
const colors = {
    'SW.1': d3.lch(57.96, 80.01, 136.29), // green #2ca02c 122-140
    'SW.2': d3.lch(67.64, 86.08, 57.67), // orange #ff7f0e 50-70
    'SW.3': d3.lch(47.36, 80.14, 257.55), // blue #1f77b4 250-280 crhoma 60?
    'SW.4': d3.lch(47.68, 80.45, 35.08) // red #d62728 25-45
};
Promise.all([d3.csv('categories.csv'), d3.csv("Metabolism/geneDataFiltered.csv")]).then(([categories, geneData]) => {
    const data = {
        type: 'root',
        name: 'Syn3 genome'
    };
    for (element of categories) {
        addToHierarchy(data, element.id, element.category, 'category');
    }
    for (gene of geneData) {
        const length = Math.abs(parseInt(gene.start) - parseInt(gene.end))
        addToHierarchy(data, gene.categoryId, gene.name, 'gene', gene.id, length, gene)
    }

    removeEmptyCategories(data);

    function weightAccessor(d) {
        return d.weight;
    }
    const rootNode = d3.hierarchy(data).sum(weightAccessor);
    for (element of rootNode.children) {
        const subgroups = element.descendants().filter( //find all lowest level subgroups
            node => node.children?.some(child => child.data.type === "gene") // that only contain leaves
        );
        const branchColor = colors[element.data.id]
        const step = 60 / subgroups.length;
        let i = 0;
        subgroups.sort(() => Math.random(random_seed) - 0.5) // randomize the order of the subgroups
        for (subelement of subgroups) {
            const chroma = branchColor.c + (i * step) - (step * (subgroups.length - 1) / 2); // center the hues around the branch color
            subelement.data.color = d3.lch(branchColor.l, chroma, branchColor.h);
            i++;
        }
    }
    const voronoiTreemap = d3.voronoiTreemap().clip([
        [0, 0],
        [0, 100],
        [100, 100],
        [100, 0]
    ]).prng(d3.randomLcg(42)); // seed generation of map
    voronoiTreemap(rootNode);

    const svg = d3.select("body").select("#voronoiTreemap")
        .append("svg")
        .attr("width", "min(90vw, 90vh, 900px)")
        .attr("height", "min(90vw, 90vh, 900px)")
        .attr("viewBox", '0 0 100 100')

    svg.selectAll("path")
        .data(rootNode.leaves().filter(d => d.data.type === "gene")) // filter out non/genes
        .join("path")
        .attr("id", d => `${d.data.type}-${d.data.id}`)
        .attr("data-name", d => d.data.name)
        .attr("d", d => `${d3.line()(d.polygon)}Z`)
        .style("fill", leafColoring)
        .on("click", (event, d) => {
            const tile = d3.select(event.currentTarget);
            const isHighlighted = tile.classed("highlighted");
            svg.selectAll('path.highlighted')
                .classed("highlighted", false)
                .style("fill", leafColoring);
            d3.select('.genome-map').selectAll('path.gene').remove()
            if (isHighlighted) {
                tile.classed("highlighted", false)
                    .style("fill", leafColoring(d));
                renderGeneInfo();
            } else {
                tile.classed("highlighted", true)
                    .style("fill", "#ffff00");
                displayGeneInfo(d.data.geneInfo);
                const geneArc = d3.arc()
                    .innerRadius(60)
                    .outerRadius(90)
                    .startAngle(geneCoordinatesToAngle(d.data.geneInfo.start))
                    .endAngle(geneCoordinatesToAngle(d.data.geneInfo.end));
                // draw the gene on the genome map
                drawGene(geneArc, "#ffff00", d.data.geneInfo);
            }
        });

    svg.append("g")
        .attr("class", "category-borders")
        .selectAll("path")
        .data(rootNode.descendants())
        .join("path")
        .attr("d", d => `${d3.line()(d.polygon)}Z`)
        .attr('id', d => d.data.name)
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("stroke-width", d => 1 / (d.depth ** 1.2))
        .attr("stroke-linejoin", "round");
    svg.selectAll('.category-borders path[id="Syn3 genome"]').attr("stroke-width", 2);
    const legendContainer = d3.select("#legend");
    legendContainer.append("h2")
        .attr("class", "legend-title")
        .on("click", () => { drawBranch(rootNode) })
        .text("Syn3 Genome");

    const legend = legendContainer
        .append("div")
        .attr("class", "legend-list");

    rootNode.children.forEach(category => {
        addLegendCategory(legend, category, category.data.id);
    });
    const metabolismLabel = d3.selectAll(".legend-label")
        .filter(function () {
            return d3.select(this).text() === "Metabolism";
        });
    metabolismLabel.text("Metabolism ")
    metabolismLabel.append("a")
        .attr("href", "/Metabolism")
        .text("(Metabolic Map)");
    renderGeneInfo();
    createGenomeMap();
});
function leafColoring(leaf) {
        const hue = leaf.parent.data.color.h;
        const lightness = leaf.parent.data.color.l - (parseInt(leaf.data.geneInfo.numberOfW) * 2); // adjust lightness based on number of W's
        const chroma = leaf.parent.data.color.c //+ (parseInt(leaf.data.geneInfo.numberOfW) * 2)
        const color = d3.lch(lightness, chroma, hue);
        return color;
    }

function addToHierarchy(data, SW, Name, type, locus = null, length = null, geneInfo = null) {
    const idList = SW.split('.')
    idList.shift()
    let numList = []
    for (i of idList) {
        const x = parseInt(i) - 1;
        numList.push(x);
    }
    if (type === 'category') { numList.pop() }
    let pointer = data;
    for (i of numList) {
        pointer = pointer.children[i];
    }

    pointer.children ??= [] //creates a new layer if non existent
    switch (type) {
        case 'category':
            pointer.children.push({ type: 'category', id: SW, name: Name });
            break;
        case 'gene':
            pointer.children.push({ type: 'gene', id: locus, name: Name, weight: length, geneInfo: geneInfo });
    }
}

function removeEmptyCategories(node) {
    if (!node.children) return false;

    node.children = node.children.filter(child => {
        if (child.type === 'gene') return true;
        return removeEmptyCategories(child);
    });

    return node.type === 'root' || node.children.length > 0;
}
function addLegendCategory(container, category, topCategoryId) {
    const subcategories = (category.children || [])
        .filter(child => child.data.type === "category");
    const item = container.append(subcategories.length ? "details" : "div")
        .attr("class", "legend-category");
    const label = subcategories.length ? item.append("summary") : item;

    label.append("span")
        .attr("class", "legend-swatch")
        .style("background-color", category.data.color || colors[topCategoryId]);
    label.append("span")
        .attr("class", "legend-label")
        .on('click', () => { drawBranch(category) })
        .text(category.data.name);

    subcategories.forEach(child => {
        addLegendCategory(item, child, topCategoryId);
    });
}
function renderGeneInfo() {
    d3.select('#gene_info').selectAll("*").remove();
    const geneInfoContainer = d3.select("#gene_info");
    geneInfoContainer.append("h2")
        .attr("class", "gene-info-title")
        .text("Gene Information");
    geneInfoContainer.append("h3")
        .attr('Class', 'gene-info-content')
        .text('Click on a gene to see its information');
}
function displayGeneInfo(geneInfo) {

    d3.select('#gene_info').selectAll(".gene-info-content").remove();
    const geneInfoContainer = d3.select("#gene_info");
    console.log(geneInfo);
    geneInfoContainer.append("h2")
        .attr("class", "gene-info-content")
        .text(geneInfo.name);
    geneInfoContainer.append("h4")
        .attr("class", "gene-info-content")
        .text(geneInfo.locus);
    geneInfoContainer.append("p")
        .attr("class", "gene-info-content")
        .text(`Category: ${geneInfo.category}`);
    geneInfoContainer.append("p")
        .attr("class", "gene-info-content")
        .text(`Annotation: ${geneInfo.annotation}`);
    geneInfoContainer.append("p")
        .attr("class", "gene-info-content")
        .text(`# of W: ${geneInfo.numberOfW}`);
    geneInfoContainer.append("p")
        .attr("class", "gene-info-content")
        .text(`Coordinates: ${geneInfo.coordinates}`);
    geneInfoContainer.append("p")
        .attr("class", "gene-info-content")
        .text(`Essentiality: ${geneInfo.essentiality}`);
    geneInfoContainer.append("a")
        .attr("class", "gene-info-content")
        .attr("target", "_blank")
        .attr("href", "https://synwiki.uni-goettingen.de/v1/gene?keyword=" + geneInfo.id)
        .text("SynWiki")
}

// ///-----------TESTING CENTER---------////////
// // import models in console
// const geneData = await d3.csv('Metabolism/geneDataFiltered.csv')
// const categories = await d3.csv('categories.csv')
//###Function definition### currently in global space so beware!!
function createGenomeMap() {
    // Create the SVG container
    const genomeMap = d3.select('body')
        .append('svg')
        .attr('class', 'genome-map')
        .attr('viewBox', '-100 -100 200 200');
    const genomeViewport = genomeMap.append('g')
        .attr('class', 'genome-viewport');
    const genomeContent = genomeViewport.append('g')
        .attr('class', 'genome-content');
    const zoomFocus = [0, -89];
    
    let rotation = 0;

    const formatValue = d3.formatPrefix(",.0", 10000);
    const groupTick = genomeContent.append("g")
    .selectAll()
    .data(groupTicks(10000))
    .join("g")
      .attr("transform", d => `rotate(${d.angle * 180 / Math.PI - 90}) translate(60,0)`);

    groupTick.append("line")
      .attr("stroke", "currentColor")
      .attr("x2", -3)
      .attr("stroke-width", 0.5);
    
    groupTick.selectAll("line")
    .filter(d => d.value % 100000 === 0)
    .attr("x2", -6)
    .attr("stroke-width", 1);
    
    groupTick
    .filter(d => d.value % 100000 === 0)
    .append("text")
      .attr('font-size', "5px")
      .attr("x", -18)
      .attr("dy", ".35em")
      .attr("transform", d => d.angle > Math.PI ? "translate(9)" : null)
      .attr("text-anchor", d => d.angle > Math.PI ? "end" : null)
      .text(d => formatValue(d.value));

    genomeMap.call(
        d3.zoom()
            .filter(event => event.type === 'wheel')
            .scaleExtent([1, 3.5])
            .on('zoom', event => {
                const scale = event.transform.k;
                genomeViewport.attr(
                    'transform',
                    d3.zoomIdentity
                        .translate(
                            zoomFocus[0] * (1 - scale),
                            zoomFocus[1] * (1 - scale)
                        )
                        .scale(scale)
                );
            })
    ).call(
        d3.drag()
            .on('drag', event => {
                rotation += event.dx * 0.5;
                genomeContent.attr('transform', `rotate(${rotation})`);
            })
    );

    // Define the full genome arc 
    const genome = d3.arc()
        .innerRadius(60)
        .outerRadius(90)
        .startAngle(0)
        .endAngle(Math.PI * 2);
        // Draw the full genome arc 
    genomeContent.append('path')
        .attr('d', genome())
        .attr('class', 'genome-path')
        .attr('fill', '#aaaa'); 
}
function drawGene(geneArc, color, geneInfo) {
    d3.select('.genome-content')
        .append('path')
        .attr('class', 'gene')
        .attr('id',geneInfo?.id)
        .attr('d', geneArc())
        .attr('fill', color)
        .on('click', event => {
            displayGeneInfo(geneInfo);
            d3.select(event.currentTarget).style('fill', '#ffff00')
           const map = d3.select("#voronoiTreemap svg");
           map.selectAll('path.highlighted')
                .classed("highlighted", false)
                .style("fill", leafColoring);
            const geneTile = map.select(`path[id="gene-${geneInfo.id}"]`);
            geneTile
                .classed("highlighted", true)
                .style("fill", "#ffff00");
        });
}
function geneCoordinatesToAngle(pos) {
    const genomeLength = 543379;
    const angle = (pos / genomeLength) * 2 * Math.PI;
    return angle;
}
function drawBranch(category){
    const borders = d3.select("body").select("#voronoiTreemap").select(".category-borders").selectAll("path");
    borders.attr("stroke", "#000")
    const categoryBorders = borders.filter(d => d.data.name === category.data.name);
    console.log(category);
    categoryBorders
        .attr("stroke", "#fffb00")
        .raise();
    d3.select('.genome-content').selectAll('path.gene').remove()
    let Wcount = 0;
    let geneCount = 0;
    for (const leaf of category.leaves()){
        if (leaf.data.type === "gene") {
            const geneArc = d3.arc()
                .innerRadius(60)
                .outerRadius(90)
                .startAngle(geneCoordinatesToAngle(leaf.data.geneInfo.start))
                .endAngle(geneCoordinatesToAngle(leaf.data.geneInfo.end));
            drawGene(geneArc, leafColoring(leaf), leaf.data.geneInfo);
            geneCount++;
            Wcount += parseInt(leaf.data.geneInfo.numberOfW);
        }
    }
    displayBranchInfo(category.data.name, geneCount, Wcount);
}
function displayBranchInfo(categoryName, geneCount, Wcount) {
    d3.select('#gene_info').selectAll(".gene-info-content").remove();
    const geneInfoContainer = d3.select("#gene_info");
    geneInfoContainer.append("h2")
        .attr("class", "gene-info-content")
        .text(categoryName);
    geneInfoContainer.append("h3")
        .attr("class", "gene-info-content")
        .text(`Genes: ${geneCount}`);
    geneInfoContainer.append("h3")
        .attr("class", "gene-info-content")
        .text(`Total W: ${Wcount}`);
}
function groupTicks(step) {
  const k = 2*Math.PI / 543379;
  return d3.range(0, 543379, step).map(value => {
    return {value: value, angle: value * k + 0};
  });
}