const colors = {
    'SW.1': d3.lch(47.36, 41.14, 257.55), // blue #1f77b4 250-280 crhoma 60?
    'SW.2': d3.lch(67.64, 86.08, 57.67), // orange #ff7f0e 50-70
    'SW.3': d3.lch(57.96, 69.01, 136.29), // green #2ca02c 122-140
    'SW.4': d3.lch(47.68, 80.45, 35.08) // red #d62728 25-45
};
Promise.all([d3.csv('categories.csv'), d3.csv("Metabolism/geneData.csv")]).then(([categories, geneData]) => {
    const data = {
        type: 'root',
        name: 'Syn3 genome'
    };
    for (element of categories){
        addToHierarchy(data, element.id, element.category, 'category');
    }
        for (gene of geneData){
            const length = Math.abs(parseInt(gene.start)-parseInt(gene.end))
            addToHierarchy(data, gene.categoryId, gene.name, 'gene', gene.id, length, gene)
        }

    removeEmptyCategories(data);

    function weightAccessor(d) {
    return d.weight;
    }
    const rootNode = d3.hierarchy(data).sum(weightAccessor);
    for (element of rootNode.children){
        const subgroups = element.descendants().filter( //find all lowest level subgroups
            node => node.children && // nodes with children
            node.children.every(child => !child.children) // that only contain leaves
        );
        const branchColor = colors[element.data.id]
        for (subelement of subgroups){
            subelement.data.color = branchColor;
            console.log(subelement);
        }
    }
    const voronoiTreemap = d3.voronoiTreemap().clip([
    [0, 0],
    [0, 100],
    [100, 100],
    [100, 0]
    ]).prng(d3.randomLcg(42)); // seed generation of map
    voronoiTreemap(rootNode);
    
    function leafColoring(leaf) {
        const hue = leaf.parent.data.color;
        console.log(hue)
        const color = hue.darker
    return color;
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
        .style("fill", leafColoring);

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

function addToHierarchy(data, SW, Name, type, locus = null, length = null, geneInfo = null){
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
            pointer.children.push({type: 'gene', id: locus, name: Name, weight:length, geneInfo: geneInfo});  
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
// ///-----------TESTING CENTER---------////////
// // import models in console
// const geneData = await d3.csv('Metabolism/geneData.csv')
// const categories = await d3.csv('categories.csv')