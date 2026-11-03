const random_seed = 42;
const colors = {
    'SW.1': d3.lch(57.96, 80.01, 136.29), // green #2ca02c 122-140
    'SW.2': d3.lch(67.64, 86.08, 57.67), // orange #ff7f0e 50-70
    'SW.3': d3.lch(47.36, 80.14, 257.55), // blue #1f77b4 250-280 crhoma 60?
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
            node =>node.children?.some(child => child.data.type === "gene") // that only contain leaves
        );
        const branchColor = colors[element.data.id]
        const step = 60/subgroups.length;
        let i = 0;
        subgroups.sort(() => Math.random(random_seed) - 0.5) // randomize the order of the subgroups
        for (subelement of subgroups){
            const chroma = branchColor.c + (i*step) - (step*(subgroups.length-1)/2); // center the hues around the branch color
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
    
    function leafColoring(leaf) {
        const hue = leaf.parent.data.color.h; 
        const lightness = leaf.parent.data.color.l - (parseInt(leaf.data.geneInfo.numberOfW) * 2); // adjust lightness based on number of W's
        const chroma = leaf.parent.data.color.c //+ (parseInt(leaf.data.geneInfo.numberOfW) * 2)
        const color = d3.lch(lightness, chroma, hue);
    return color;
    }

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
    
    const legend = d3.select("#legend")
        .append("div")
        .attr("class", "legend-list");

    function addLegendCategory(container, category, topCategoryId) {
        const subcategories = (category.children || [])
            .filter(child => child.data.type === "category");
        const item = container.append(subcategories.length ? "details" : "div")
            .attr("class", "legend-category");
        const label = subcategories.length ? item.append("summary") : item;

        label.append("span")
            .attr("class", "legend-swatch")
            .style("background-color", colors[topCategoryId]);
        label.append("span")
            .text(category.data.name);

        subcategories.forEach(child => {
            addLegendCategory(item, child, topCategoryId);
        });
    }

    rootNode.children.forEach(category => {
        addLegendCategory(legend, category, category.data.id);
    });
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