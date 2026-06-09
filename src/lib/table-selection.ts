export function toggleSelection(selectedIds: string[], id: string, checked: boolean) {
  if (checked) {
    return selectedIds.includes(id) ? selectedIds : [...selectedIds, id];
  }

  return selectedIds.filter((item) => item !== id);
}

export function togglePageSelection(
  selectedIds: string[],
  pageIds: string[],
  checked: boolean
) {
  const pageIdSet = new Set(pageIds);
  const remaining = selectedIds.filter((id) => !pageIdSet.has(id));

  return checked ? [...remaining, ...pageIds] : remaining;
}

export function isPageFullySelected(selectedIds: string[], pageIds: string[]) {
  return pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
}

export function isPagePartiallySelected(selectedIds: string[], pageIds: string[]) {
  return pageIds.some((id) => selectedIds.includes(id)) && !isPageFullySelected(selectedIds, pageIds);
}
