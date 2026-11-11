//###Imports and global var definitions###
const preact = escher.libs.preact;
const h = preact.createElement;
const selectedGenes = new Set();
const selectedPathways = new Set();
let Wcounter = 0;
let genomeCountLabel;
const onclickcolor = '#ff0000';
const highlightcolor = '#ffe600';
var tooltipStyle = {
  'min-width': '40px',
  'min-height': '10px',
  'border-radius': '2px',
  'border': '1px solid #b58787',
  'padding': '7px',
  'background-color': '#fff',
  'text-align': 'left',
  'font-size': '16px',
  'font-family': 'sans-serif',
  'color': '#111',
  'box-shadow': '4px 6px 20px 0px rgba(0, 0, 0, 0.4)'
};
//###Main body###
// load model and gene data
Promise.all([d3.json('syn3_metabolism.json'), d3.json('syn3_model.json'), d3.csv("../geneDataFiltered.csv"), d3.csv("../segments.csv")]).then(([mapData, modelData, geneData, segments]) => {
  const Tooltip = props => {
    const type = props.type;
    const id = props.biggId;
    let clicked = false;
    let geneId;
    let printedInfo;
    console.log(geneData);
    switch (type) {
      case 'gene':
        // create tooltip info
        geneId = id.slice(-4); // Get the last 4 characters of the id
        const gene_info = d3.index(geneData, (d) => d.id).get(geneId);
        printedInfo = h('div', { style: tooltipStyle, onclick: () => onclickGene(geneId, geneArc, gene_info.numberOfW) },
          'id: ',
          gene_info.id,
          h('br'),
          'locus: ',
          gene_info.locus,
          h('br'),
          'name: ',
          gene_info.name,
          h('br'),
          'coordinates: ',
          gene_info.start,
          '-',
          gene_info.end,
          h('br'),
          'Essentiality: ',
          gene_info.essentiality,
          h('br'),
          '# of W: ',
          gene_info.numberOfW,
          h('br'),
          'Category: ',
          gene_info.category,
          h('br'),
          h('a', { href: "https://synwiki.uni-goettingen.de/v1/gene?keyword=" + gene_info.id, target: '_blank' }, 'SynWiki')
        )


        const geneArc = d3.arc()
          .innerRadius(60)
          .outerRadius(90)
          .startAngle(geneCoordinatesToAngle(gene_info.start))
          .endAngle(geneCoordinatesToAngle(gene_info.end));
        // draw the gene on the genome map
        drawGene(geneArc, highlightcolor, 'temp-gene-path');
        break;
      case 'reaction':
        const pathway = getPathway(id, modelData);
        console.log(pathway);
        const reactionData = pathway.reactionData;
        const reactions = pathway.reactions;
        const genes = pathway.genes;
        const subsystem = reactionData.subsystem;
        const EC = reactionData.notes?.['EC number'];
        printedInfo = h('div', { style: tooltipStyle },
          id,
          h('br'),
          type,
          h('br'),
          h('button', {
            type: 'highlight pathway',
            onclick: () => selectPathway(genes, geneData, onclickcolor, subsystem, reactions),
            onmouseenter: () => drawPathway(genes, geneData, highlightcolor, 'temp-' + subsystem),
            onmouseleave: () => d3.select('.genome-map').selectAll('[class="temp-' + subsystem + '"]').remove()
          },
            subsystem),
          h('br'),
          h('a', { href: EC?.link, target: '_blank' }, EC?.id)
        );
        break;
      case 'metabolite':
        const name = props.name;
        printedInfo = h('div', { style: tooltipStyle },
          type,
          h('br'),
          id,
          h('br'),
          name
        );
    }
    return printedInfo;
  }
  var options = {
    menu: 'all',
    fill_screen: true,
    never_ask_before_quit: true,
    show_gene_reaction_rules: true,
    gene_font_size: 24,
    background_image_url: 'Background.png',
    first_load_callback: builder => {
      builder.map.convert_map();
      builder.map.callback_manager.set('delay_hide_tooltip.custom_handler', () => onTooltipHide()); //generate custom event for tooltip hide
      createGenomeMap(segments);
      d3.select('#map_container').on('click.gene-label', function (event) {
        const label = event.target.closest('.gene-label');
        if (!label) return; // Exit if the click was not on a gene label
        const geneId = label.textContent.trim().slice(-4);
        const geneInfo = d3.index(geneData, d => d.id).get(geneId);
        const geneArc = d3.arc()
          .innerRadius(60)
          .outerRadius(90)
          .startAngle(geneCoordinatesToAngle(geneInfo.start))
          .endAngle(geneCoordinatesToAngle(geneInfo.end));
        onclickGene(geneId, geneArc, geneInfo.numberOfW);
      });
    },
    tooltip_component: Tooltip
  };
  escher.Builder(
    mapData,
    modelData,
    null,
    escher.libs.d3_select('#map_container'),
    options
  );
});


//###Function definition### currently in global space so beware!!
function createGenomeMap(segments) {
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
    for (segment of segments) {
        const startAngle = geneCoordinatesToAngle(segment.start);
        let endAngle = geneCoordinatesToAngle(segment.end);
        if (endAngle < startAngle) endAngle += 2 * Math.PI;
        const genome = d3.arc()
            .innerRadius(60)
            .outerRadius(90)
            .startAngle(startAngle)
            .endAngle(endAngle);
        // Draw the full genome arc 
        genomeContent.append('path')
            .attr('d', genome())
            .attr('class', 'genome-path')
            .attr('fill', '#aaaa');
        if (parseInt(segment.num) % 2 === 0) { //draw it again if segment number is even
            genomeContent.append('path')
                .attr('d', genome())
                .attr('class', 'genome-path')
                .attr('fill', '#9999');
        }
    }
}
function drawGene(geneArc, color, id) {
  d3.select('.genome-map') // Set viewBox origin at the center and set width and height to 200 (for coding it can be scaled at css)
    .append('path')
    .attr('d', geneArc())
    .attr('class', id)
    .attr('fill', color);
}
function geneCoordinatesToAngle(pos) {
  const genomeLength = 543379;
  const angle = (pos / genomeLength) * 2 * Math.PI;
  return angle;
}
function onclickGene(geneId, geneArc, numberOfW) {
  if (!selectedGenes.has(geneId)) {
    selectedGenes.add(geneId);
    highlightGene(geneId, onclickcolor); //highlight the gene label in the map
    Wcounter += parseInt(numberOfW);
    drawGene(geneArc, color = onclickcolor, id = geneId); //draw the gene with the onclick color
  } else {
    selectedGenes.delete(geneId);
    highlightGene(geneId, null); //un-highlight the gene label in the map
    Wcounter -= parseInt(numberOfW);
    d3.select('.genome-map').select('[class="' + geneId + '"]').remove(); //remove the gene color property
  }
  genomeCountLabel.text(Wcounter);
  console.log('Selected genes:', Array.from(selectedGenes));
}

function onTooltipHide() {
  d3.selectAll(".temp-gene-path").remove()
}
function highlightGene(id, color) { //change the color of the gene label (and all instances of the same gene) if highlighted
  const targetLabel = d3.selectAll(".gene-label")
    .filter(function () {
      return this.textContent.trim().slice(-4) === id;
    });

  targetLabel.style("fill", color);
}
function highlightReactions(reactions, color) { //change the color of the gene label (and all instances of the same gene) if highlighted
  const targetLabel = d3.selectAll(".reaction-label")
    .filter(function () {
      return reactions.includes(this.textContent);
    });

  targetLabel.style("fill", color);
}
function getPathway(reactionId, modelData) {
  const reactionData = d3.group(modelData.reactions, d => d.id).get(reactionId)[0]; // get the reaction data from the given ID
  const subsystem = reactionData.subsystem; // get reaction group
  const subsystemReactions = d3.group(modelData.reactions, d => d.subsystem).get(subsystem); // get all reactions in the same group
  const subsystemGenes = new Set();
  for (const reaction of subsystemReactions) { // add all genes from the same reaction group to set
    const genes = reaction.gene_reaction_rule.split(/\s+(?:and|or)\s+/i); // Split the gene_reaction_rule by "and" or "or"
    for (const gene of genes) {
      subsystemGenes.add(gene);
    }
  }
  subsystemGenes.delete("")
  return {
    reactionData: reactionData,
    reactions: subsystemReactions.map(d => d.id),
    genes: subsystemGenes,
  }
}

function drawPathway(genes, geneData, color, pathway) {
  for (const gene of genes) {
    const geneId = gene.slice(-4);
    const gene_info = d3.index(geneData, (d) => d.id).get(geneId);
    const geneArc = d3.arc()
      .innerRadius(60)
      .outerRadius(90)
      .startAngle(geneCoordinatesToAngle(gene_info.start))
      .endAngle(geneCoordinatesToAngle(gene_info.end));
    // draw the gene on the genome map
    drawGene(geneArc, color, pathway);

  }
}
function selectPathway(genes, geneData, color, pathway, reactions) {
  if (!selectedPathways.has(pathway)) {
    highlightReactions(reactions, onclickcolor)
    selectedPathways.add(pathway);
    for (const gene of genes) {
      const geneId = gene.slice(-4);
      const gene_info = d3.index(geneData, (d) => d.id).get(geneId);
      let numberOfW = gene_info.numberOfW;
      if (selectedGenes.has(geneId)) numberOfW = 0;
      selectedGenes.add(geneId);
      highlightGene(geneId, onclickcolor); //highlight the gene label in the map
      Wcounter += parseInt(numberOfW);
      const geneArc = d3.arc()
        .innerRadius(60)
        .outerRadius(90)
        .startAngle(geneCoordinatesToAngle(gene_info.start))
        .endAngle(geneCoordinatesToAngle(gene_info.end));
      drawGene(geneArc, color = color, id = geneId); //draw the gene with the onclick color
    }
  } else {
    highlightReactions(reactions, null)
    selectedPathways.delete(pathway);
    for (const gene of genes) {
      const geneId = gene.slice(-4);
      const gene_info = d3.index(geneData, (d) => d.id).get(geneId);
      let numberOfW = gene_info.numberOfW;
      if (!selectedGenes.has(geneId)) numberOfW = 0;
      highlightGene(geneId, null); //un-highlight the gene label in the map
      selectedGenes.delete(geneId);
      Wcounter -= parseInt(numberOfW);
      d3.select('.genome-map').selectAll('[class="' + geneId + '"]').remove(); //remove the gene color property
    }
  }
  genomeCountLabel.text(Wcounter);
  console.log('Selected genes:', Array.from(selectedGenes));
}
function groupTicks(step) {
    const k = 2 * Math.PI / 543379;
    return d3.range(0, 543379, step).map(value => {
        return { value: value, angle: value * k + 0 };
    });
}

// ///-----------TESTING CENTER---------////////
// // import models in console
// const mapData = await d3.json('syn3_metabolism.json')
// const modelData = await d3.json('syn3_model.json')
// const geneData = await d3.csv('geneData.csv')