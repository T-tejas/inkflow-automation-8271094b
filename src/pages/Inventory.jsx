import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInventory, INVENTORY_CATEGORIES } from "@/hooks/useInventory";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { InventoryFormDialog } from "@/components/inventory/InventoryFormDialog";
import { NeedleCharts } from "@/components/inventory/NeedleCharts";
import { LowStockAlerts } from "@/components/inventory/LowStockAlerts";
import { InventoryExport } from "@/components/inventory/InventoryExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Package, TrendingDown, IndianRupee, AlertTriangle } from "lucide-react";
import { formatINR } from "@/lib/currency";
import { motion } from "framer-motion";
const Inventory = () => {
  const navigate = useNavigate();
  const {
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
    deductNeedle
  } = useInventory();
  const [formOpen, setFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Needles");
  const getItemsByCategory = (cat) => items.filter((i) => i.category === cat);
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>;
  }
  return <div className="min-h-screen bg-background">
      {
    /* Header */
  }
      <header className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <motion.div
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center"
  >
              <span className="text-primary-foreground font-bold text-sm">F19</span>
            </motion.div>
            <div>
              <h1 className="text-lg font-bold text-foreground">F19 Tattoo Inventory</h1>
              <p className="text-[11px] text-muted-foreground">Stock Management & Needle Tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <InventoryExport items={items} needleItems={needleItems} usageLogs={usageLogs} />
            <Button onClick={() => setFormOpen(true)} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {
    /* Stats Cards */
  }
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" /> Total Items
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{items.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5" /> Total Value
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{formatINR(totalInventoryValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5" /> Needle Value
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{formatINR(totalNeedleValue)}</p>
            </CardContent>
          </Card>
          <Card className={lowStockItems.length > 0 ? "border-destructive/30" : ""}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Low Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className={`text-2xl font-bold ${lowStockItems.length > 0 ? "text-destructive" : ""}`}>
                {lowStockItems.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {
    /* Low Stock Alerts */
  }
        <LowStockAlerts items={lowStockItems} />

        {
    /* Needle Charts */
  }
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Needle Analytics</h2>
          <NeedleCharts needleItems={needleItems} usageLogs={usageLogs} />
        </div>

        {
    /* Inventory by Category */
  }
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Inventory</h2>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              {INVENTORY_CATEGORIES.map((cat) => <TabsTrigger key={cat} value={cat} className="text-xs">
                  {cat} ({getItemsByCategory(cat).length})
                </TabsTrigger>)}
            </TabsList>
            {INVENTORY_CATEGORIES.map((cat) => <TabsContent key={cat} value={cat}>
                <InventoryTable
    items={getItemsByCategory(cat)}
    category={cat}
    onUpdate={updateItem}
    onDelete={deleteItem}
    onDeduct={deductNeedle}
  />
              </TabsContent>)}
          </Tabs>
        </div>
      </main>

      <InventoryFormDialog
    open={formOpen}
    onOpenChange={setFormOpen}
    onSubmit={async (data) => {
      const ok = await addItem(data);
      if (ok) setFormOpen(false);
      return ok;
    }}
  />
    </div>;
};
var stdin_default = Inventory;
export {
  stdin_default as default
};
