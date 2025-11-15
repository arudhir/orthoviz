# KEGG Pathway Data

This directory contains metabolic pathway data based on the **KEGG (Kyoto Encyclopedia of Genes and Genomes)** database.

## kegg_tca_cycle.json

Real data for the **TCA Cycle (Citric Acid Cycle)** pathway with ortholog mappings across three organisms.

### Source

- **KEGG Pathway**: map00020 (Citric acid cycle)
- **Organisms**:
  - **Human**: Homo sapiens (hsa) - mitochondrial enzymes
  - **Bacteria**: Escherichia coli K-12 (eco) - model prokaryote
  - **Plant**: Arabidopsis thaliana (ath) - model plant

### Enzymes Included

All enzymes in the dataset are based on real KEGG Orthology (KO) numbers:

#### Core TCA Cycle Enzymes

1. **Citrate synthase** (K01647)
   - Human: CS gene
   - E. coli: gltA gene
   - Arabidopsis: CSY3 gene

2. **Aconitase** (K01681/K01682)
   - Human: ACO2 (mitochondrial)
   - E. coli: acnA/acnB (two isozymes)
   - Arabidopsis: ACO2

3. **Isocitrate dehydrogenase** (K00031)
   - Human: IDH2/IDH3 (NAD+-dependent)
   - E. coli: icd (NADP+-dependent)
   - Arabidopsis: IDH (both NAD+ and NADP+ forms)

4. **α-Ketoglutarate dehydrogenase complex** (K00164)
   - Human: OGDH gene
   - E. coli: sucA/sucB genes
   - Arabidopsis: OGDH

5. **Succinyl-CoA ligase/synthetase** (K01902/K01903)
   - Human: SUCLG1/SUCLG2 (GTP-forming)
   - E. coli: sucC/sucD (ATP-forming)
   - Arabidopsis: SCS

6. **Succinate dehydrogenase** (K00239-K00242)
   - Human: SDHA/B/C/D (Complex II)
   - E. coli: sdhA/B/C/D
   - Arabidopsis: SDH1/SDH2

7. **Fumarase** (K01676/K01679)
   - Human: FH gene
   - E. coli: fumA/fumB/fumC (three isozymes)
   - Arabidopsis: FUM1/FUM2

8. **Malate dehydrogenase** (K00024)
   - Human: MDH2 (mitochondrial)
   - E. coli: mdh
   - Arabidopsis: mMDH1/mMDH2

#### Entry and Energy Production

9. **Pyruvate dehydrogenase** (K00161-K00163)
   - Entry point to TCA cycle
   - Converts pyruvate → acetyl-CoA

10. **NADH dehydrogenase** (Complex I) (K00330-K00340)
    - Electron transport chain component
    - Oxidizes NADH produced by TCA cycle

11. **ATP synthase** (Complex V) (K02111-K02115)
    - Final step of energy production
    - Synthesizes ATP using proton gradient

### Key Biological Insights

#### Evolutionary Conservation

The TCA cycle is **highly conserved** across all three domains of life, demonstrating:

- **Ancient origin**: Predates the divergence of bacteria, archaea, and eukaryotes
- **Essential function**: Core metabolic pathway for energy production
- **Structural similarity**: Orthologs share similar 3D structures and catalytic mechanisms

#### Organism-Specific Differences

Despite conservation, there are interesting differences:

**Human (Mitochondrial)**
- Compartmentalized in mitochondria
- Tightly regulated by Ca²⁺ and energy status
- NAD+-dependent isocitrate dehydrogenase
- GTP-forming succinyl-CoA ligase

**E. coli (Bacterial)**
- Cytoplasmic enzymes
- Can run in reverse (reductive TCA) under anaerobic conditions
- NADP+-dependent isocitrate dehydrogenase
- ATP-forming succinyl-CoA ligase
- Multiple isozymes for environmental adaptation

**Arabidopsis (Plant)**
- Mitochondrial TCA cycle
- Also interfaces with photorespiration
- Multiple cellular compartments (mitochondria, plastids, cytosol)
- Different regulatory mechanisms due to light/dark cycles

#### Engineering Opportunities

This visualization highlights opportunities for metabolic engineering:

1. **Bacterial modules** → **Human cells**:
   - Alternative NADP+ dependency for redox balance
   - Oxygen-independent variants for hypoxic conditions

2. **Plant modules** → **Human cells**:
   - Light-responsive regulation mechanisms
   - Photoprotective enzymes
   - Alternative carbon fixation pathways

3. **Cross-kingdom optimization**:
   - Mix-and-match enzyme variants for optimal performance
   - Introduce bypass pathways
   - Engineer novel regulatory circuits

### Visualization Features

When loaded in the 3D viewer:

- **33 nodes** (11 enzyme types × 3 organisms)
- **69 edges** total:
  - 33 pathway edges (within each organism)
  - 22 ortholog edges (cross-organism connections)
  - 14 additional metabolic connections

- **3 layers**:
  - Top (blue): Human mitochondrial enzymes
  - Middle (amber): E. coli enzymes
  - Bottom (green): Arabidopsis enzymes

- **Interactive info cards** show:
  - Enzyme names (common and gene-specific)
  - KEGG Orthology (KO) numbers
  - Biological functions
  - Organism-specific notes

### How to Use

#### Load in the Visualizer

1. **Upload via UI**:
   - Click "Upload Data" button
   - Select `kegg_tca_cycle.json`
   - Watch the real pathway data load!

2. **Set as default**:
   - Edit `main.js` line ~160
   - Change: `fetch('data/demo_edges.json')`
   - To: `fetch('data/kegg_tca_cycle.json')`

#### Explore the Data

- **Hover** over nodes to see enzyme names
- **Click** nodes to read detailed biological notes
- **Toggle layers** to focus on specific organisms
- **Toggle ortholog beams** to see evolutionary relationships

### References

- **KEGG**: https://www.kegg.jp/
- **TCA Cycle Pathway**: https://www.kegg.jp/pathway/map00020
- **KEGG Orthology**: https://www.genome.jp/kegg/ko.html

### Extending This Dataset

To add more pathways:

1. Look up the KEGG pathway (e.g., map00190 for oxidative phosphorylation)
2. Find organism-specific versions (hsa00190, eco00190, ath00190)
3. Get KO numbers for each enzyme
4. Match orthologs across organisms using KO numbers
5. Create nodes and edges following this JSON format

You can use the `scripts/fetch_kegg_data.py` script as a starting point (note: KEGG API may require institutional access).

---

**This dataset represents real biological data and demonstrates the power of comparative metabolic pathway analysis for synthetic biology and metabolic engineering applications.**
