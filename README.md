# Metabolic Pathways 3D Visualization

A presentation-grade 3D visualization of metabolic pathways across three biological systems: human mitochondria, bacteria, and plant chloroplasts. Built for investor demos to communicate the potential of rewiring mitochondrial biology using biochemical modules from other organisms.

![Visualization Preview](preview.png)

## Overview

This web application visualizes metabolic pathways in an interactive 3D environment with three stacked planes representing:

1. **Top Plane** - Human mitochondrial reactions (blue/cyan)
2. **Middle Plane** - Bacterial orthologs and enzyme classes (amber/orange)
3. **Bottom Plane** - Plant/chloroplast counterparts (green)

The visualization shows both:
- **Pathway connections** within each layer (thin white lines)
- **Ortholog relationships** across layers (glowing pink-purple beams)

## Quick Start

### Running the Application

#### Option 1: Direct Browser (Simplest)

Simply open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge).

**Note:** Some browsers may block loading external resources when opening local files directly. If you see a blank screen, use Option 2.

#### Option 2: Local Server (Recommended)

Using Python 3:
```bash
python -m http.server 8000
```

Or using Python 2:
```bash
python -m SimpleHTTPServer 8000
```

Or using Node.js:
```bash
npx http-server
```

Then open your browser to `http://localhost:8000`

### Controls

- **Rotate**: Left-click and drag
- **Pan**: Right-click and drag (or Shift + left-click)
- **Zoom**: Mouse wheel or pinch gesture
- **Hover**: Hover over nodes to see labels and highlight connections
- **Click**: Click nodes to view detailed information
- **Toggle Layers**: Use the legend panel to show/hide layers
- **Upload Data**: Click the "Upload Data" button to load your own JSON or CSV files

## Data Model

### JSON Format

The primary data format is JSON (`data/demo_edges.json`). Structure:

```json
{
  "nodes": [
    {
      "id": "unique_identifier",
      "label": "Display Name",
      "layer": "human_mito|bacteria|plant",
      "type": "metabolite|enzyme|cofactor",
      "role": "Brief functional description (optional)",
      "notes": "Additional details (optional)"
    }
  ],
  "edges": [
    {
      "source": "node_id_1",
      "target": "node_id_2",
      "kind": "pathway|ortholog",
      "layer": "human_mito|bacteria|plant (for pathway edges only)"
    }
  ]
}
```

#### Node Fields

- **id** (required): Unique identifier for the node
- **label** (required): Display name shown in UI
- **layer** (required): One of `human_mito`, `bacteria`, or `plant`
- **type** (optional): Classification such as `metabolite`, `enzyme`, `cofactor`
- **role** (optional): Brief functional description
- **notes** (optional): Extended description shown in info card

#### Edge Fields

- **source** (required): ID of the starting node
- **target** (required): ID of the ending node
- **kind** (required): Either `pathway` (within-layer connection) or `ortholog` (cross-layer connection)
- **layer** (optional): For pathway edges, specifies which layer the edge belongs to

### CSV Format

For easier data entry, you can use the CSV format (`data/demo_edges.csv`):

```csv
# human_substrate,human_product,bacteria_substrate,bacteria_product,plant_substrate,plant_product
Citrate,Isocitrate,Citrate_bac,Isocitrate_bac,Citrate_pl,Isocitrate_pl
Isocitrate,Alpha-Ketoglutarate,Isocitrate_bac,AKG_bac,Isocitrate_pl,AKG_pl
```

#### Column Structure

1. **Column 1**: Human mitochondrial substrate
2. **Column 2**: Human mitochondrial product
3. **Column 3**: Bacterial substrate (optional)
4. **Column 4**: Bacterial product (optional)
5. **Column 5**: Plant substrate (optional)
6. **Column 6**: Plant product (optional)

#### CSV Rules

- Lines starting with `#` are treated as comments
- Empty columns are allowed (for incomplete ortholog information)
- Each row represents one reaction step across all three systems
- Node naming convention: use suffixes `_bac` for bacteria, `_pl` for plant

#### Converting CSV to JSON

The application includes a CSV parser function (`parseCsvToGraph`) in `main.js`. To use it:

1. Load your CSV file content
2. Call the parser:

```javascript
import { parseCsvToGraph } from './main.js';

const csvText = `...your CSV content...`;
const graphData = parseCsvToGraph(csvText);
console.log(JSON.stringify(graphData, null, 2));
```

3. Save the output as a new JSON file in the `data/` directory
4. Update the fetch URL in `main.js` line ~105 to load your new file

## Customizing the Visualization

### Adding New Data

#### Option 1: Upload via UI (Easiest!)

1. **Prepare your data** in either JSON or CSV format (see Data Model section above)
2. **Click the "Upload Data" button** in the legend panel
3. **Select your file** (.json or .csv)
4. **Watch the visualization reload** with your new data automatically!

The upload feature:
- ✅ Supports both JSON and CSV formats
- ✅ Validates data structure before loading
- ✅ Shows helpful error messages if something is wrong
- ✅ Automatically clears old visualization and loads new one
- ✅ Perfect for live demos and quick iteration

#### Option 2: Replace Default Data

1. **Create your dataset** in either CSV or JSON format following the schemas above
2. **Save the file** in the `data/` directory
3. **Update `main.js`** to load your file:

```javascript
// Around line 182 in main.js
const response = await fetch('data/your_custom_data.json');
```

4. **Reload the page** to see your new visualization

### Modifying Colors

Edit the `CONFIG.colors` object in `main.js`:

```javascript
const CONFIG = {
    colors: {
        human_mito: 0x4FC3F7,    // Hex color for human layer
        bacteria: 0xFFB74D,       // Hex color for bacteria layer
        plant: 0x81C784,          // Hex color for plant layer
        orthologBeam: [0xFF6B9D, 0xC371F5], // Gradient for cross-plane edges
        background: 0x0a1628      // Background color
    }
};
```

### Adjusting Layout

Modify layout parameters in the `CONFIG` object:

```javascript
const CONFIG = {
    planeSpacing: 8,              // Distance between planes
    planeTilt: Math.PI / 12,      // Angle of plane tilt (radians)
    planeSize: { width: 20, height: 12 },  // Plane dimensions
    nodeRadius: 0.25,             // Size of node spheres
    // ... more options
};
```

### Animation Timing

Adjust animation speeds:

```javascript
const CONFIG = {
    animation: {
        introDelay: 500,          // Initial delay before animation (ms)
        planeDuration: 600,       // Time between plane animations (ms)
        nodeStagger: 80,          // Delay between node animations (ms)
        beamSpeed: 0.001          // Speed of beam pulsing effect
    }
};
```

## Technology Stack

- **Three.js** (v0.160.0) - 3D rendering engine
- **OrbitControls** - Camera interaction
- **Pure JavaScript** - No build system required
- **ES6 Modules** - Modern modular structure
- **CSS3** - Styling and animations

## File Structure

```
orthoviz/
├── index.html              # Main HTML file
├── style.css               # Styles and UI theming
├── main.js                 # Core application logic and Three.js setup
├── data/
│   ├── demo_edges.json     # Sample data in JSON format
│   └── demo_edges.csv      # Sample data in CSV format
└── README.md               # This file
```

## Browser Compatibility

Tested and working in:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires WebGL support and ES6 module support.

## Demo Dataset

The included demo visualizes the TCA (Tricarboxylic Acid) cycle, also known as the Krebs cycle:

### Demo Data (demo_edges.json)

- **Human mitochondria**: Complete TCA cycle plus electron transport chain representation
- **Bacteria (E. coli)**: Bacterial TCA cycle with differences in regulation and cofactor usage
- **Plant**: Mitochondrial TCA cycle plus photosynthetic electron transport representation

This demonstrates how the same fundamental biochemical pathway operates across different biological systems.

### Real KEGG Data (kegg_tca_cycle.json) ⭐ NEW

For a more realistic investor demo, we've included **real metabolic pathway data from KEGG**:

- **33 enzymes** with actual gene names and KEGG Orthology (KO) numbers
- **Real orthologs** across Human (Homo sapiens), E. coli, and Arabidopsis
- **Scientifically accurate** enzyme functions and pathway connections
- **Based on KEGG map00020** (TCA Cycle pathway)

**To use the real KEGG data:**
1. Click "Upload Data" and select `data/kegg_tca_cycle.json`, OR
2. Edit `main.js` line ~160 to load this file by default

See [data/KEGG_DATA.md](data/KEGG_DATA.md) for detailed information about the dataset.

**Key enzymes included:**
- Citrate synthase (K01647)
- Aconitase (K01681/K01682)
- Isocitrate dehydrogenase (K00031)
- α-Ketoglutarate dehydrogenase (K00164)
- Succinate dehydrogenase / Complex II (K00239-K00242)
- NADH dehydrogenase / Complex I (K00330-K00340)
- ATP synthase / Complex V (K02111-K02115)

This real data makes your presentation more compelling and scientifically grounded!

## Performance Notes

- Optimized for datasets up to ~100 nodes per layer
- For larger datasets, consider:
  - Implementing level-of-detail (LOD) rendering
  - Using instanced meshes for nodes
  - Implementing frustum culling for edges

## Troubleshooting

### Blank Screen

1. Check browser console for errors
2. Ensure you're using a local server (not file://)
3. Verify Three.js CDN is accessible
4. Check that data files are in the correct location

### Missing Nodes or Edges

1. Validate JSON structure
2. Ensure all node IDs referenced in edges exist
3. Check layer names match exactly: `human_mito`, `bacteria`, or `plant`

### Performance Issues

1. Reduce number of nodes/edges
2. Disable ortholog beams toggle
3. Try a different browser
4. Check GPU/WebGL support

## Future Enhancements

Potential additions for production use:

- Data import UI (drag-and-drop CSV/JSON)
- Export to image/video
- Camera path recording for presentations
- Multiple pathway comparison
- Enzyme annotation integration (EC numbers, etc.)
- Pathway highlighting presets
- VR support

## License

MIT License - Feel free to use and modify for your presentations and research.

## Credits

Created for demonstrating cross-species metabolic pathway engineering and synthetic biology approaches. Designed for investor presentations and educational purposes.

## Contact

For questions, issues, or suggestions about customizing this visualization for your specific metabolic pathways, please open an issue or submit a pull request.

---

**Happy visualizing!** 🧬✨
