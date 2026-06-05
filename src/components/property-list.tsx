export function PropertyList({
  items
}: {
  items: Array<{ label: string; value: string | number | string[] | undefined }>;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 text-sm">
          <span className="text-muted-foreground">{item.label}</span>
          <span className="font-medium text-surface-900">
            {Array.isArray(item.value) ? item.value.join("、") : item.value || "-"}
          </span>
        </div>
      ))}
    </div>
  );
}
