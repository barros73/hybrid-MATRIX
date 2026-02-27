export interface MatrixLink {
    matrix_id: string; // e.g., MTX-1042
    cardinality: '1:1' | '1:N' | 'N:1' | 'N:M';
    layer1_sources: string[]; // List of REQ-XXX IDs
    layer3_targets: Layer3Target[];
    status: 'VALID' | 'BROKEN' | 'ORPHAN';
    last_verified: string;
}

export interface Layer3Target {
    file_path: string;
    construct_name?: string;
    language: 'rust' | 'cpp' | 'python' | 'typescript' | 'javascript' | 'go';
    expected_tag: string; // e.g., "@MATRIX: REQ-SEC-01"
}

export interface MatrixStore {
    matrix_version: string;
    links: MatrixLink[];
    orphans: {
        unlinked_requirements: string[];
        unlinked_code_tags: string[];
    };
}
