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
    let angle = 0
    const rootNode = d3.hierarchy(data).sum(weightAccessor);
    for (branch of rootNode.children){
        const subgroups = branch.descendants().filter( //find all lowest level subgroups
            node => node.children && // nodes with children
            node.children.every(child => !child.children) // that only contain leaves
        );
        for (subranch of subgroups){
            subranch.data.angle = angle
            angle = angle + 7.2
        }
        angle = angle + 7.2
    }

    const voronoiTreemap = d3.voronoiTreemap().clip([
    [0, 0],
    [0, 100],
    [100, 100],
    [100, 0]
    ]).prng(d3.randomLcg(42)); // seed generation of map
    voronoiTreemap(rootNode);
    
    function leafColoring(leaf) {
        const hue = leaf.parent.data.angle;
        const color = d3.lch(100,230,hue);
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