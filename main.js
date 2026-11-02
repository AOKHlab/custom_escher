Promise.all([d3.csv('categories.csv'), d3.csv("Metabolism/geneData.csv")]).then(([categories, geneData]) => {
    const data = {
        type: 'root',
        name: 'Syn3 genome'
    };
    for (element of categories){
        addToHierarchy(data, element.id, element.category, 'category');
    }
    console.log(data);
        for (gene of geneData){
            const length = Math.abs(parseInt(gene.start)-parseInt(gene.end))
            addToHierarchy(data, gene.categoryId, gene.name, 'gene', gene.id, length)
        }
    console.log(data);

    removeEmptyCategories(data);

    function weightAccessor(d) {
    return d.weight;
    }

    const rootNode = d3.hierarchy(data).sum(weightAccessor);

    const voronoiTreemap = d3.voronoiTreemap().clip([
    [0, 0],
    [0, 100],
    [100, 100],
    [100, 0]
    ]).prng(d3.randomLcg(42)); // seed generation of map
    voronoiTreemap(rootNode);

    const groupColor = d3.scaleOrdinal(d3.schemeCategory10)
    .domain(data.children.map(group => group.id));

    function fillForLeaf(leaf) {
    const group = leaf.ancestors().find(node => node.depth === 1);
    const groupLeaves = group.leaves();
    const shadeIndex = groupLeaves.indexOf(leaf);
    const shadePosition = groupLeaves.length === 1
        ? 0.5
        : shadeIndex / (groupLeaves.length - 1);
    const color = d3.hsl(groupColor(group.data.id));

    color.l = 0.3 + shadePosition * 0.5;
    return color.formatHex();
    }

    const svg = d3.select("body")
        .append("svg")
        .attr("width", "min(90vw, 90vh, 900px)")
        .attr("height", "min(90vw, 90vh, 900px)")
        .attr("viewBox", '0 0 100 100')
        .style("position", "fixed")
        .style("top", "50%")
        .style("left", "50%")
        .style("transform", "translate(-50%, -50%)")

    svg.selectAll("path")
        .data(rootNode.leaves().filter(d => d.data.type === "gene")) // filter out non/genes
        .join("path")
        .attr("id", d => `${d.data.type}-${d.data.id}`)
        .attr("data-name", d => d.data.name)
        .attr("d", d => `${d3.line()(d.polygon)}Z`)
        .style("fill", fillForLeaf);

    svg.append("g")
        .attr("class", "category-borders")
        .selectAll("path")
        .data(rootNode.descendants())
        .join("path")
        .attr("d", d => `${d3.line()(d.polygon)}Z`)
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("stroke-width", d => 1 / (d.depth**2))
        .attr("stroke-linejoin", "round");
});

function addToHierarchy(data, SW, Name, type, locus = null, length = null){
    const idList = SW.split('.')
    idList.shift()
    let numList = []
    for (i of idList){
        const x = parseInt(i)-1;
        numList.push(x);
    }
    if (type === 'category'){numList.pop()}
    let pointer = data;
    for (i of numList){
        pointer = pointer.children[i];
    }
    
    pointer.children ??= [] //creates a new layer if non existent
    switch (type){
        case 'category':
            pointer.children.push({type: 'category', id: SW, name: Name});
        break;
        case 'gene':
            pointer.children.push({type: 'gene', id: locus, name: Name, weight:length});  
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
