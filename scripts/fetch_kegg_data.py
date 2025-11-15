#!/usr/bin/env python3
"""
Fetch metabolic pathway data from KEGG and convert to visualization format.

Usage:
    python fetch_kegg_data.py --pathway map00020 --output data/kegg_tca_cycle.json
"""

import argparse
import json
import re
import time
from urllib.request import urlopen
from urllib.error import HTTPError
from typing import Dict, List, Set, Tuple


# Organism codes
ORGANISMS = {
    'human': 'hsa',
    'bacteria': 'eco',  # E. coli
    'plant': 'ath'  # Arabidopsis thaliana
}

# Layer mapping
LAYER_MAP = {
    'hsa': 'human_mito',
    'eco': 'bacteria',
    'ath': 'plant'
}


def kegg_get(endpoint: str, max_retries: int = 3) -> str:
    """Fetch data from KEGG REST API with retries."""
    base_url = "https://rest.kegg.jp"
    url = f"{base_url}/{endpoint}"

    for attempt in range(max_retries):
        try:
            print(f"Fetching: {url}")
            with urlopen(url) as response:
                data = response.read().decode('utf-8')
                time.sleep(0.5)  # Be nice to KEGG API
                return data
        except HTTPError as e:
            if e.code == 404:
                return None
            if attempt < max_retries - 1:
                print(f"Retry {attempt + 1}/{max_retries}...")
                time.sleep(2)
            else:
                raise
    return None


def get_pathway_info(pathway_id: str, organism: str) -> Dict:
    """Get pathway information for a specific organism."""
    org_code = ORGANISMS.get(organism)
    if not org_code:
        return None

    # Try organism-specific pathway
    org_pathway = pathway_id.replace('map', org_code)
    data = kegg_get(f"get/{org_pathway}")

    if not data:
        print(f"No pathway found for {organism} ({org_pathway})")
        return None

    return parse_pathway_data(data, org_code)


def parse_pathway_data(data: str, org_code: str) -> Dict:
    """Parse KEGG pathway data to extract genes and reactions."""
    genes = {}
    compounds = {}
    current_section = None

    for line in data.split('\n'):
        line = line.rstrip()

        # Section headers
        if line.startswith('GENE'):
            current_section = 'GENE'
            line = line[4:].strip()
        elif line.startswith('COMPOUND'):
            current_section = 'COMPOUND'
            line = line[8:].strip()
        elif line.startswith('ENZYME'):
            current_section = 'ENZYME'
            continue
        elif line and not line.startswith(' '):
            current_section = None
            continue

        # Parse gene entries
        if current_section == 'GENE' and line:
            # Format: "gene_id  gene_name; description"
            match = re.match(r'^\s*(\S+)\s+(.+?)(?:;|$)', line)
            if match:
                gene_id = match.group(1)
                gene_name = match.group(2).split(';')[0].strip()
                genes[gene_id] = {
                    'id': f"{org_code}:{gene_id}",
                    'name': gene_name,
                    'org': org_code
                }

        # Parse compound entries
        elif current_section == 'COMPOUND' and line:
            match = re.match(r'^\s*(C\d+)\s+(.+)', line)
            if match:
                cpd_id = match.group(1)
                cpd_name = match.group(2).strip()
                compounds[cpd_id] = {
                    'id': cpd_id,
                    'name': cpd_name
                }

    return {
        'genes': genes,
        'compounds': compounds,
        'org': org_code
    }


def get_ko_mapping(gene_id: str) -> str:
    """Get KEGG Orthology (KO) number for a gene."""
    data = kegg_get(f"link/ko/{gene_id}")
    if not data:
        return None

    # Format: "gene_id\tko:K#####"
    for line in data.split('\n'):
        if line.strip():
            parts = line.split('\t')
            if len(parts) == 2:
                ko = parts[1].replace('ko:', '')
                return ko
    return None


def build_ortholog_map(pathway_id: str) -> Dict[str, Dict]:
    """Build ortholog mapping using KO numbers."""
    print(f"\nFetching pathway data for {pathway_id}...")

    # Get pathway data for each organism
    org_data = {}
    for organism in ['human', 'bacteria', 'plant']:
        print(f"\nFetching {organism} data...")
        data = get_pathway_info(pathway_id, organism)
        if data:
            org_data[organism] = data

    # Build KO-based ortholog map
    ko_map = {}  # ko_number -> {organism: [gene_ids]}

    for organism, data in org_data.items():
        org_code = ORGANISMS[organism]
        print(f"\nMapping KO numbers for {organism}...")

        for gene_id, gene_info in list(data['genes'].items())[:10]:  # Limit for demo
            full_gene_id = f"{org_code}:{gene_id}"
            ko = get_ko_mapping(full_gene_id)

            if ko:
                if ko not in ko_map:
                    ko_map[ko] = {}
                if organism not in ko_map[ko]:
                    ko_map[ko][organism] = []
                ko_map[ko][organism].append(gene_info)
                print(f"  {gene_info['name']}: {ko}")

    return ko_map, org_data


def create_visualization_data(ko_map: Dict, org_data: Dict, pathway_name: str) -> Dict:
    """Convert KEGG data to visualization format."""
    nodes = []
    edges = []
    node_id_map = {}

    # Create nodes for each ortholog group
    for ko, organisms in ko_map.items():
        # Only include KO groups with at least 2 organisms
        if len(organisms) < 2:
            continue

        for organism, genes in organisms.items():
            # Take first gene as representative
            gene = genes[0]
            org_code = ORGANISMS[organism]
            layer = LAYER_MAP[org_code]

            node_id = f"{ko}_{org_code}"
            node_id_map[ko] = node_id_map.get(ko, {})
            node_id_map[ko][organism] = node_id

            nodes.append({
                'id': node_id,
                'label': gene['name'],
                'layer': layer,
                'type': 'enzyme',
                'role': f"KO:{ko}",
                'notes': f"{organism.capitalize()} ortholog of {gene['name']}"
            })

    # Create ortholog edges between organisms
    for ko, organism_map in node_id_map.items():
        organisms_list = list(organism_map.keys())

        # Connect human to bacteria
        if 'human' in organism_map and 'bacteria' in organism_map:
            edges.append({
                'source': organism_map['human'],
                'target': organism_map['bacteria'],
                'kind': 'ortholog'
            })

        # Connect human to plant
        if 'human' in organism_map and 'plant' in organism_map:
            edges.append({
                'source': organism_map['human'],
                'target': organism_map['plant'],
                'kind': 'ortholog'
            })

        # Connect bacteria to plant
        if 'bacteria' in organism_map and 'plant' in organism_map:
            edges.append({
                'source': organism_map['bacteria'],
                'target': organism_map['plant'],
                'kind': 'ortholog'
            })

    # Add some pathway edges (simple sequential connections within each layer)
    for organism, data in org_data.items():
        layer = LAYER_MAP[ORGANISMS[organism]]
        layer_nodes = [n for n in nodes if n['layer'] == layer]

        # Connect nodes sequentially within the same layer
        for i in range(len(layer_nodes) - 1):
            edges.append({
                'source': layer_nodes[i]['id'],
                'target': layer_nodes[i + 1]['id'],
                'kind': 'pathway',
                'layer': layer
            })

    return {
        'metadata': {
            'pathway': pathway_name,
            'source': 'KEGG',
            'organisms': list(ORGANISMS.keys()),
            'generated': time.strftime('%Y-%m-%d %H:%M:%S')
        },
        'nodes': nodes,
        'edges': edges
    }


def main():
    parser = argparse.ArgumentParser(description='Fetch KEGG pathway data')
    parser.add_argument('--pathway', default='map00020', help='KEGG pathway ID (e.g., map00020 for TCA cycle)')
    parser.add_argument('--output', default='data/kegg_pathway.json', help='Output JSON file')
    parser.add_argument('--name', default='TCA Cycle', help='Pathway display name')

    args = parser.parse_args()

    print(f"Fetching KEGG data for pathway: {args.pathway}")
    print(f"Organisms: {', '.join(ORGANISMS.keys())}")

    # Build ortholog map
    ko_map, org_data = build_ortholog_map(args.pathway)

    print(f"\nFound {len(ko_map)} KO groups")
    print(f"Ortholog groups with multiple organisms: {sum(1 for ko, orgs in ko_map.items() if len(orgs) >= 2)}")

    # Convert to visualization format
    viz_data = create_visualization_data(ko_map, org_data, args.name)

    print(f"\nGenerated visualization data:")
    print(f"  Nodes: {len(viz_data['nodes'])}")
    print(f"  Edges: {len(viz_data['edges'])}")

    # Save to file
    with open(args.output, 'w') as f:
        json.dump(viz_data, f, indent=2)

    print(f"\nSaved to: {args.output}")
    print("\nTo use this data:")
    print(f"  1. Upload via the UI: Click 'Upload Data' and select {args.output}")
    print(f"  2. Or update main.js to load this file by default")


if __name__ == '__main__':
    main()
