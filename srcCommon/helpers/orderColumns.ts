export function compareValues(
  valueA: string | number,
  valueB: string | number,
  orderAsc: boolean
) {
  if (valueA == null && valueB != null) return orderAsc ? 1 : -1;
  if (valueA != null && valueB == null) return orderAsc ? -1 : 1;
  if (valueA > valueB) return orderAsc ? 1 : -1;
  if (valueA < valueB) return orderAsc ? -1 : 1;

  return 0;
}
