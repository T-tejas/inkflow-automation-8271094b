import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
function downloadCSV(filename, headers, rows) {
  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
function InventoryExport({ items, needleItems, usageLogs }) {
  const exportUsage = () => {
    const headers = ["Item", "Type", "Grouping", "Qty Used", "Usage Type", "Notes", "Date"];
    const rows = usageLogs.map((l) => {
      const item = items.find((i) => i.id === l.inventory_item_id);
      return [
        item?.item_name || "",
        item?.needle_type || "",
        item?.grouping || "",
        l.quantity_used.toString(),
        l.usage_type,
        l.notes || "",
        new Date(l.created_at).toLocaleDateString()
      ];
    });
    downloadCSV("needle_usage_report.csv", headers, rows);
  };
  const exportValue = () => {
    const headers = ["Item", "Type", "Grouping", "Stock", "Cost/Unit", "Total Value"];
    const rows = needleItems.map((i) => [
      i.item_name,
      i.needle_type || "",
      i.grouping || "",
      i.quantity_in_stock.toString(),
      i.cost_per_unit.toString(),
      (i.quantity_in_stock * i.cost_per_unit).toFixed(2)
    ]);
    downloadCSV("needle_value_report.csv", headers, rows);
  };
  const exportPurchase = () => {
    const headers = ["Item", "Category", "Supplier", "Stock", "Min Required", "Cost/Unit", "Total Value", "Status"];
    const rows = items.map((i) => [
      i.item_name,
      i.category,
      i.supplier || "",
      i.quantity_in_stock.toString(),
      i.minimum_required.toString(),
      i.cost_per_unit.toString(),
      (i.quantity_in_stock * i.cost_per_unit).toFixed(2),
      i.quantity_in_stock <= i.minimum_required ? "LOW STOCK" : "OK"
    ]);
    downloadCSV("inventory_purchase_cost_report.csv", headers, rows);
  };
  return <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportUsage}>
        <Download className="h-3.5 w-3.5" /> Needle Usage Report
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportValue}>
        <Download className="h-3.5 w-3.5" /> Needle Value Report
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportPurchase}>
        <Download className="h-3.5 w-3.5" /> Purchase & Cost Report
      </Button>
    </div>;
}
export {
  InventoryExport
};
