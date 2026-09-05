export function designGroundObligationRef(
  targetKey: string,
  method: string,
  conditionKey: string,
  factRef: string,
): string {
  return `design.${targetKey}.${method}.${conditionKey}.${factRef}`;
}

export function sameDesignObligationSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    left.every((value) => right.includes(value))
  );
}
