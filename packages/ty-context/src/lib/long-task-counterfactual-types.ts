export type CounterfactualMutationV2 =
  | { type: "remove_paths"; paths: string[] }
  | { type: "replace_file"; path: string; fixture_path: string }
  | {
      type: "replace_json_value";
      path: string;
      pointer: string;
      value: unknown;
    }
  | {
      type: "replace_text";
      path: string;
      match: string;
      replacement: string;
    };

export interface CounterfactualControlV2 {
  key: string;
  binding_key: string;
  claims: string[];
  check_key: string;
  mutation: CounterfactualMutationV2;
  expected_assertion_failures: string[];
  preserved_assertions: string[];
  allowed_fanout_assertions: string[];
}

export interface GlobalCounterfactualControlV2 {
  key: string;
  binding_ref: string;
  claims: string[];
  check_key: string;
  mutation: CounterfactualMutationV2;
  expected_assertion_failures: string[];
  preserved_assertions: string[];
  allowed_fanout_assertions: string[];
}
