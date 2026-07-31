export const DESIGN_RESOURCE_SYMBOLIC_FACT_POLICY = {
  symbolic_denotation_efficiency_delivery: true,
  control_relations_unchanged: true,
  forbidden_symbolic_shortcuts_absent: true,
  symbolic_inventory_is_not_completion: true,
  v1_capacity: {
    embedded_handoff_max_bytes: 8_388_608,
    canonical_manifest_max_bytes: 33_554_432,
    expected_fact_cells_max: 16_384,
    capacity_header_prefix_max_bytes: 65_536,
  },
} as const;
