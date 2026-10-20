const preact = escher.libs.preact;
const h = preact.createElement;
let Wcounter = 0;
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
function geneCoordinatesToAngle(pos){
  const genomeLength = 543379;
  const angle = (pos / genomeLength) * 2 * Math.PI;
  return angle;
}
// load model and gene data
Promise.all([d3.json('syn3_metabolism.json'), d3.json('syn3_model.json'), d3.csv("geneData.csv")]).then(([mapData, modelData, geneData]) => {
  const Tooltip = props => {
    const type = props.type;
    const id = props.biggId;
    let geneId;
    let printedInfo;
    const isGene = (type === 'gene');
    if (isGene){
      // create tooltip info
      geneId = id.slice(-4); // Get the last 4 characters of the id
      const gene_info = d3.index(geneData, (d) => d.id).get(geneId);
      printedInfo = h('div', { style: tooltipStyle },
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
      Wcounter = parseInt(gene_info.numberOfW) + Wcounter; // Update the W counter with the number of W for this gene
      console.log(`Total number of W for all genes: ${Wcounter}`); // Log the total number of W for all genes
      // draw the gene on the genome map
       const gene = d3.arc()
          .innerRadius(60)
          .outerRadius(90)
          .startAngle(geneCoordinatesToAngle(gene_info.start))
          .endAngle(geneCoordinatesToAngle(gene_info.end));

        d3.select('body')
          .append('svg')
          .attr('class', 'genome-map')
          .attr('viewBox', '-100 -100 200 200') // Set viewBox origin at the center and set width and height to 200 (for coding it can be scaled at css)
          .append('path')
          .attr('d', gene())
          .attr('fill', '#ffe600');
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
      first_load_callback: builder => {
        builder.map.convert_map();

        const genome = d3.arc()
          .innerRadius(60)
          .outerRadius(90)
          .startAngle(0)
          .endAngle(Math.PI * 2);

        d3.select('body')
          .append('svg')
          .attr('class', 'genome-map')
          .attr('viewBox', '-100 -100 200 200') // Set viewBox origin at the center and set width and height to 200 (for coding it can be scaled at css)
          .append('path')
          .attr('d', genome())
          .attr('fill', '#aaaa');
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
