import YAML from "yaml";

export function parseYaml(content: string): unknown {
  return YAML.parse(content);
}

export function stringifyYaml(value: unknown): string {
  return `${YAML.stringify(value, { lineWidth: 0 })}`;
}
