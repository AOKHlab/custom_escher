//###Imports and global var definitions###
const preact = escher.libs.preact;
const h = preact.createElement;
const selectedGenes = new Set();
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
Promise.all([d3.json('syn3_metabolism.json'), d3.json('syn3_model.json'), d3.csv("geneData.csv")]).then(([mapData, modelData, geneData]) => {
  const Tooltip = props => {
    const type = props.type;
    const id = props.biggId;
    let clicked = false;
    let geneId;
    let printedInfo;
    const isGene = (type === 'gene');
    if (isGene){
      // create tooltip info
      geneId = id.slice(-4); // Get the last 4 characters of the id
      const gene_info = d3.index(geneData, (d) => d.id).get(geneId);
      printedInfo = h('div', { style: tooltipStyle, onclick: () => onclickGene(geneId,geneArc,gene_info.numberOfW) },
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
      h('a',{href:"https://synwiki.uni-goettingen.de/v1/gene?keyword="+gene_info.id, target:'_blank'},'SynWiki')
      )
      

      const geneArc = d3.arc()
          .innerRadius(60)
          .outerRadius(90)
          .startAngle(geneCoordinatesToAngle(gene_info.start))
          .endAngle(geneCoordinatesToAngle(gene_info.end));
      // draw the gene on the genome map
      drawGene(geneArc, highlightcolor,'temp-gene-path'); 
    } else {
      printedInfo = h('div', { style: tooltipStyle },
      type,
      h('br'),
      id
      );
    };
    return printedInfo;
    };
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
        createGenomeMap();
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
function createGenomeMap() {
// Create the SVG container
  const genomeMap = d3.select('body')
      .append('svg')
      .attr('class', 'genome-map')
      .attr('viewBox', '-100 -100 200 200');

// Define the full genome arc  
  const genome = d3.arc()
    .innerRadius(60)
    .outerRadius(90)
    .startAngle(0)
    .endAngle(Math.PI * 2);

// Draw the full genome arc  
  genomeMap.append('path')
    .attr('d', genome())
    .attr('class', 'genome-path')
    .attr('fill', '#aaaa');
// Draw genome counter
  genomeCountLabel = genomeMap.append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-family', 'sans-serif')
    .attr('font-size', 24)
    .attr('font-weight', 'bold')
    .attr('fill', '#222')
    .text(Wcounter);
}
function drawGene(geneArc,color, id) {
  d3.select('.genome-map') // Set viewBox origin at the center and set width and height to 200 (for coding it can be scaled at css)
    .append('path')
    .attr('d', geneArc())
    .attr('class', id)
    .attr('fill', color);
}
function geneCoordinatesToAngle(pos){
  const genomeLength = 543379;
  const angle = (pos / genomeLength) * 2 * Math.PI;
  return angle;
}
function onclickGene(geneId, geneArc,numberOfW) {
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
function highlightGene(id,color) { //change the color of the gene label (and all instances of the same gene) if highlighted
  const targetLabel = d3.selectAll(".gene-label")
  .filter(function () {
    return this.textContent.trim().slice(-4) === id;
  });

targetLabel.style("fill", color);
}