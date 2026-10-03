/** PRD-009 (009C-AC-013, MTK-010). True when an import needs a manifest entry it does not have. */
export function isUndeclaredImport(
  importedPackage: string,
  declaredDependencies: ReadonlySet<string>,
): boolean;
