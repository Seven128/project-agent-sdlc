export function importedName(imported) {
  return imported?.type === "Identifier" ? imported.name : imported?.value;
}

export function ignoredAstKey(key) {
  return key === "end" || key === "loc" || key === "range" || key === "start";
}
