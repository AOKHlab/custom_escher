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
    let locus;
    if (type === 'gene'){
      locus = id.slice(-4); // Get the last 4 characters of the id
      const gene_info = myArray.findIndex(x => x.id === locus);
    }

    return h('div', { style: tooltipStyle },
      h('br'),
      gene_info.coordinates,
      h('br'),
      type,
      h('br'),
      id
      );
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
