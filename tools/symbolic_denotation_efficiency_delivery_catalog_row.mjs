export const symbolicDeliveryRow = (
  key,
  kind,
  family,
  property,
  group,
  statement,
  options = {},
) => ({ key, kind, family, property, group, statement, ...options });
