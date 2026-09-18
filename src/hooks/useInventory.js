import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
const INVENTORY_CATEGORIES = [
  "Needles",
  "Ink",
  "Machines",
  "Power Supplies",
  "Gloves",
  "Aftercare / Cleaning"
];
const NEEDLE_TYPES = [
  { value: "RL", label: "Round Liner (RL)", desc: "Fine lines / detailed work" },
  { value: "RS", label: "Round Shader (RS)", desc: "Soft shading / gradients" },
  { value: "M1", label: "Magnum (M1)", desc: "Large colour packing / shading" },
  { value: "M2", label: "Soft Magnum (M2)", desc: "Smooth shading with softer edges" },
  { value: "CM", label: "Curved Magnum (CM)", desc: "Smooth shading on curves" },
  { value: "TM", label: "Textured Magnum (TM)", desc: "Textured shading effects" },
  { value: "Bugpin", label: "Bugpin Needles", desc: "Fine shading / portrait work" }
];
function useInventory() {
  const [items, setItems] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase.from("inventory_items").select("*").order("category", { ascending: true }).order("item_name", { ascending: true });
    if (error) {
      toast({ title: "Error loading inventory", description: error.message, variant: "destructive" });
    } else {
      setItems(data);
    }
  }, [toast]);
  const fetchUsageLogs = useCallback(async () => {
    const { data, error } = await supabase.from("needle_usage_log").select("*").order("created_at", { ascending: false }).limit(500);
    if (!error) setUsageLogs(data);
  }, []);
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchItems(), fetchUsageLogs()]).finally(() => setLoading(false));
  }, [fetchItems, fetchUsageLogs]);
  const addItem = async (item) => {
    const { error } = await supabase.from("inventory_items").insert(item);
    if (error) {
      toast({ title: "Failed to add item", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Item added" });
    await fetchItems();
    return true;
  };
  const updateItem = async (id, updates) => {
    const { error } = await supabase.from("inventory_items").update({ ...updates, last_updated: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Item updated" });
    await fetchItems();
    return true;
  };
  const deleteItem = async (id) => {
    const { error } = await supabase.from("inventory_items").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Item deleted" });
    await fetchItems();
    return true;
  };
  const deductNeedle = async (itemId, qty, leadId, notes, usageType = "manual") => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return false;
    const newQty = Math.max(0, item.quantity_in_stock - qty);
    const { error: updateErr } = await supabase.from("inventory_items").update({ quantity_in_stock: newQty, last_updated: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", itemId);
    if (updateErr) return false;
    await supabase.from("needle_usage_log").insert({
      inventory_item_id: itemId,
      lead_id: leadId || null,
      quantity_used: qty,
      usage_type: usageType,
      notes: notes || null
    });
    await Promise.all([fetchItems(), fetchUsageLogs()]);
    return true;
  };
  const lowStockItems = items.filter((i) => i.quantity_in_stock <= i.minimum_required);
  const needleItems = items.filter((i) => i.category === "Needles");
  const totalInventoryValue = items.reduce((sum, i) => sum + i.quantity_in_stock * i.cost_per_unit, 0);
  const totalNeedleValue = needleItems.reduce((sum, i) => sum + i.quantity_in_stock * i.cost_per_unit, 0);
  return {
    items,
    usageLogs,
    loading,
    lowStockItems,
    needleItems,
    totalInventoryValue,
    totalNeedleValue,
    addItem,
    updateItem,
    deleteItem,
    deductNeedle,
    refetch: fetchItems
  };
}
export {
  INVENTORY_CATEGORIES,
  NEEDLE_TYPES,
  useInventory
};
