const preact = escher.libs.preact;
const h = preact.createElement;
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

//-------------------------------------
// TOOLTIP 1: Tooltip with random pics
//-------------------------------------
// load model and gene data
Promise.all([d3.json('syn3_metabolism.json'), d3.json('syn3_model.json'), d3.csv("geneData.csv")]).then(([mapData, modelData, geneData]) => {
  const Tooltip = props => {
    const type = props.type;
    const id = props.biggId;
    let geneId;
    let printedInfo;
    const isGene = (type === 'gene');
    if (isGene){
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
      gene_info.Start,
      '-',
      gene_info.End,
      h('br'),
      'Essentiality: ',
      gene_info.essentiality,
      h('br'),
      '# of W: ',
      gene_info.number_of_W,
      h('br'),
      'Category: ',
      gene_info.Category,
      h('br'),
      //synWiky link??
      )
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
      first_load_callback: null,
      gene_font_size: 24,
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
