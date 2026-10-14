const preact = escher.libs.preact;
const h = preact.createElement;
const Component = preact.Component;
async function file_get_contents(uri, callback) {
    let res = await fetch(uri),
        ret = await res.text();
    return callback ? callback(ret) : ret; // a Promise() actually.
}
function call(txt){
  console.log(txt);
}
d3.csvParse(await file_get_contents('geneData.csv',call)); //working only on console
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

const Tooltip = props => {
  var type = props.type;
  var id = props.biggId;
  var coordinates = genedata[0][2]
  return (
    // Style the text based on our tooltip_style object
    h('div', { style: tooltipStyle},
      // Update the text to read out the identifier biggId
      coordinates,
      h('br'),
      type,
      h('br'),
      id,
     )
  );
};


//---------------------
// Load the Escher map
//---------------------

 // fech map data
 escher.libs.d3_json('syn3_metabolism.json', function (e, map_data) {
   if (e) console.warn(e);
   // fech model data
   escher.libs.d3_json('syn3_model.json', function (e, model_data) {
     if (e) console.warn(e);

     var options = { //set options
       menu: 'all',
       fill_screen: true,
       never_ask_before_quit: true,
       show_gene_reaction_rules: true,
       first_load_callback:null,
       gene_font_size:24,
       tooltip_component: Tooltip
     };
     var b = escher.Builder(map_data, model_data, null, escher.libs.d3_select('#map_container'), options);
   });
 });
