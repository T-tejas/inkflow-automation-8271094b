import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { INVENTORY_CATEGORIES, NEEDLE_TYPES } from "@/hooks/useInventory";
function InventoryFormDialog({ open, onOpenChange, editItem, onSubmit }) {
  const [category, setCategory] = useState(editItem?.category || "Needles");
  const [itemName, setItemName] = useState(editItem?.item_name || "");
  const [needleType, setNeedleType] = useState(editItem?.needle_type || "");
  const [gauge, setGauge] = useState(editItem?.gauge || "");
  const [grouping, setGrouping] = useState(editItem?.grouping || "");
  const [purposeNotes, setPurposeNotes] = useState(editItem?.purpose_notes || "");
  const [supplier, setSupplier] = useState(editItem?.supplier || "");
  const [qty, setQty] = useState(editItem?.quantity_in_stock?.toString() || "0");
  const [minReq, setMinReq] = useState(editItem?.minimum_required?.toString() || "5");
  const [costPerUnit, setCostPerUnit] = useState(editItem?.cost_per_unit?.toString() || "0");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (editItem) {
      setCategory(editItem.category);
      setItemName(editItem.item_name);
      setNeedleType(editItem.needle_type || "");
      setGauge(editItem.gauge || "");
      setGrouping(editItem.grouping || "");
      setPurposeNotes(editItem.purpose_notes || "");
      setSupplier(editItem.supplier || "");
      setQty(editItem.quantity_in_stock.toString());
      setMinReq(editItem.minimum_required.toString());
      setCostPerUnit(editItem.cost_per_unit.toString());
    }
  }, [editItem]);
  const isNeedles = category === "Needles";
  const handleSubmit = async () => {
    if (!itemName.trim()) return;
    setSubmitting(true);
    const data = {
      category,
      item_name: itemName.trim(),
      supplier,
      quantity_in_stock: parseInt(qty) || 0,
      minimum_required: parseInt(minReq) || 5,
      cost_per_unit: parseFloat(costPerUnit) || 0,
      purpose_notes: purposeNotes || null
    };
    if (isNeedles) {
      data.needle_type = needleType || null;
      data.gauge = gauge || null;
      data.grouping = grouping || null;
    } else {
      data.needle_type = null;
      data.gauge = null;
      data.grouping = null;
    }
    await onSubmit(data);
    setSubmitting(false);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editItem ? "Edit Item" : "Add Inventory Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={!!editItem}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVENTORY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Item Name</Label>
            <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Round Liner 5RL" />
          </div>
          {isNeedles && <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Needle Type</Label>
                  <Select value={needleType} onValueChange={setNeedleType}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {NEEDLE_TYPES.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Gauge</Label>
                  <Input value={gauge} onChange={(e) => setGauge(e.target.value)} placeholder="0.30mm" />
                </div>
              </div>
              <div>
                <Label>Grouping</Label>
                <Input value={grouping} onChange={(e) => setGrouping(e.target.value)} placeholder="e.g. 9RL, 7RS" />
              </div>
            </>}
          <div>
            <Label>Purpose / Notes</Label>
            <Textarea value={purposeNotes} onChange={(e) => setPurposeNotes(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Supplier</Label>
            <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Quantity</Label>
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div>
              <Label>Min Required</Label>
              <Input type="number" value={minReq} onChange={(e) => setMinReq(e.target.value)} />
            </div>
            <div>
              <Label>Cost/Unit (₹)</Label>
              <Input type="number" value={costPerUnit} onChange={(e) => setCostPerUnit(e.target.value)} />
            </div>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={submitting || !itemName.trim()}>
            {submitting ? "Saving..." : editItem ? "Update Item" : "Add Item"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
}
export {
  InventoryFormDialog
};
