"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoadmapItemCard } from "@/components/roadmap/RoadmapItemCard";
import { RoadmapFormSheet } from "@/components/roadmap/RoadmapFormSheet";
import { DndContext, DragEndEvent, DragStartEvent, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  user_story: string | null;
  expected_results: string | null;
  display_order: number;
  is_active: boolean;
  department: string;
  category: string | null;
  triggers: string[];
  status?: string | null;
  have_state?: string | null;
  branch_name?: string | null;
}

const STATUSES = ["doing", "next-up", "someday", "inbox"] as const;
const STATUS_LABELS: Record<string, string> = {
  doing: "Doing",
  "next-up": "Next Up",
  someday: "Someday",
  inbox: "Inbox",
};

const HAVE_STATES = ["Must", "Should", "Could", "Want"] as const;
const HAVE_STATE_LABELS: Record<string, string> = {
  Must: "Must Have",
  Should: "Should Have",
  Could: "Could Have",
  Want: "Want",
};

function DroppableColumn({
  id,
  label,
  items,
  onEdit,
  canManage,
  onStatusChange,
  onHaveStateChange,
  viewType,
}: {
  id: string;
  label: string;
  items: RoadmapItem[];
  onEdit: (item: RoadmapItem) => void;
  canManage: boolean;
  onStatusChange?: () => void;
  onHaveStateChange?: () => void;
  viewType: "status" | "have_state";
}) {
  const { setNodeRef } = useDroppable({ id });

  // Don't render empty swimlanes
  if (items.length === 0) return null;

  return (
    <div ref={setNodeRef} className="w-full bg-muted/30 rounded-lg p-4 mb-6">
      <div className="font-semibold text-lg mb-4 flex items-center gap-2">
        {label}
        <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
      </div>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {items.map((item) => {
            const currentValue = viewType === "status" 
              ? (item.status || "inbox")
              : (item.have_state || "Want");
            
            return (
              <SortableItem
                key={item.id}
                item={item}
                status={item.status || "inbox"}
                currentValue={currentValue}
                onEdit={() => onEdit(item)}
                canManage={canManage}
                onStatusChange={onStatusChange}
                onHaveStateChange={onHaveStateChange}
              />
            );
          })}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableItem({
  item,
  status,
  currentValue,
  onEdit,
  canManage,
  onStatusChange,
  onHaveStateChange,
}: {
  item: RoadmapItem;
  status: string;
  currentValue: string;
  onEdit: () => void;
  canManage: boolean;
  onStatusChange?: () => void;
  onHaveStateChange?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <RoadmapItemCard 
        item={item} 
        status={status} 
        onEdit={onEdit} 
        canManage={canManage} 
        listeners={listeners}
        onStatusChange={onStatusChange}
        onHaveStateChange={onHaveStateChange}
      />
    </div>
  );
}

export default function RoadmapPage() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewType, setViewType] = useState<"status" | "have_state">("status");
  const { isOwner } = useUserRole();

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("roadmap_items")
      .select("*")
      .order("display_order", { ascending: true });

    if (!error && data) {
      setItems(data as RoadmapItem[]);
    }
  };

  useEffect(() => {
    fetchItems();

    const subscription = supabase
      .channel("roadmap_items_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "roadmap_items" }, fetchItems)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Group items by status or have_state based on view type
  const itemsByStatus = STATUSES.reduce((acc, status) => {
    acc[status] = items
      .filter((item) => (item.status || "inbox") === status)
      .sort((a, b) => a.display_order - b.display_order);
    return acc;
  }, {} as Record<string, RoadmapItem[]>);

  const itemsByHaveState = HAVE_STATES.reduce((acc, haveState) => {
    acc[haveState] = items
      .filter((item) => (item.have_state || "Want") === haveState)
      .sort((a, b) => a.display_order - b.display_order);
    return acc;
  }, {} as Record<string, RoadmapItem[]>);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the item being dragged
    const activeItem = items.find((item) => item.id === activeId);
    if (!activeItem) return;

    if (viewType === "status") {
      // STATUS VIEW - handle status-based drag-drop
      const overStatus = STATUSES.find((status) => overId === status);
      
      if (overStatus) {
        // Dropped on a column - change status
        const { error } = await supabase
          .from("roadmap_items")
          .update({
            status: overStatus,
            is_active: overStatus === "doing",
          })
          .eq("id", activeId);

        if (error) {
          toast.error("Failed to update status");
        } else {
          toast.success(`Moved to ${STATUS_LABELS[overStatus]}`);
          fetchItems();
        }
        return;
      }

      // Dropped on another item - reorder within same status or move to new status
      const overItem = items.find((item) => item.id === overId);
      if (!overItem) return;

      const activeStatus = activeItem.status || "inbox";
      const overItemStatus = overItem.status || "inbox";

      if (activeStatus === overItemStatus) {
        // Same column - reorder
        const statusItems = itemsByStatus[activeStatus];
        const oldIndex = statusItems.findIndex((item) => item.id === activeId);
        const newIndex = statusItems.findIndex((item) => item.id === overId);

        if (oldIndex === newIndex) return;

        const reorderedItems = [...statusItems];
        const [moved] = reorderedItems.splice(oldIndex, 1);
        reorderedItems.splice(newIndex, 0, moved);

        // Update display_order for all items in this status
        const updates = reorderedItems.map((item, index) => ({
          id: item.id,
          display_order: index,
        }));

        for (const update of updates) {
          await supabase.from("roadmap_items").update({ display_order: update.display_order }).eq("id", update.id);
        }

        toast.success("Reordered");
        fetchItems();
      } else {
        // Different column - change status and move to top
        const overStatusItems = itemsByStatus[overItemStatus];
        const newDisplayOrder = overStatusItems.length > 0 ? Math.max(...overStatusItems.map(i => i.display_order)) + 1 : 0;

        const { error } = await supabase
          .from("roadmap_items")
          .update({
            status: overItemStatus,
            is_active: overItemStatus === "doing",
            display_order: newDisplayOrder,
          })
          .eq("id", activeId);

        if (error) {
          toast.error("Failed to move item");
        } else {
          toast.success(`Moved to ${STATUS_LABELS[overItemStatus]}`);
          fetchItems();
        }
      }
    } else {
      // HAVE_STATE VIEW - handle have_state-based drag-drop
      const overHaveState = HAVE_STATES.find((state) => overId === state);
      
      if (overHaveState) {
        // Dropped on a column - change have_state
        const { error } = await supabase
          .from("roadmap_items")
          .update({ have_state: overHaveState })
          .eq("id", activeId);

        if (error) {
          toast.error("Failed to update have state");
        } else {
          toast.success(`Moved to ${HAVE_STATE_LABELS[overHaveState]}`);
          fetchItems();
        }
        return;
      }

      // Dropped on another item - reorder within same have_state or move to new have_state
      const overItem = items.find((item) => item.id === overId);
      if (!overItem) return;

      const activeHaveState = activeItem.have_state || "Want";
      const overItemHaveState = overItem.have_state || "Want";

      if (activeHaveState === overItemHaveState) {
        // Same column - reorder
        const haveStateItems = itemsByHaveState[activeHaveState];
        const oldIndex = haveStateItems.findIndex((item) => item.id === activeId);
        const newIndex = haveStateItems.findIndex((item) => item.id === overId);

        if (oldIndex === newIndex) return;

        const reorderedItems = [...haveStateItems];
        const [moved] = reorderedItems.splice(oldIndex, 1);
        reorderedItems.splice(newIndex, 0, moved);

        // Update display_order for all items in this have_state
        const updates = reorderedItems.map((item, index) => ({
          id: item.id,
          display_order: index,
        }));

        for (const update of updates) {
          await supabase.from("roadmap_items").update({ display_order: update.display_order }).eq("id", update.id);
        }

        toast.success("Reordered");
        fetchItems();
      } else {
        // Different column - change have_state and move to top
        const overHaveStateItems = itemsByHaveState[overItemHaveState];
        const newDisplayOrder = overHaveStateItems.length > 0 ? Math.max(...overHaveStateItems.map(i => i.display_order)) + 1 : 0;

        const { error } = await supabase
          .from("roadmap_items")
          .update({
            have_state: overItemHaveState,
            display_order: newDisplayOrder,
          })
          .eq("id", activeId);

        if (error) {
          toast.error("Failed to move item");
        } else {
          toast.success(`Moved to ${HAVE_STATE_LABELS[overItemHaveState]}`);
          fetchItems();
        }
      }
    }
  };

  const handleEdit = (item: RoadmapItem) => {
    setEditingItem(item);
    setSheetOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setSheetOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Roadmap</h1>
          <p className="text-muted-foreground">
            Drag items between columns to change {viewType === "status" ? "status" : "have state"} • Use dropdown to update
          </p>
        </div>
        {isOwner() && (
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Roadmap Item
          </Button>
        )}
      </div>

      <div className="flex gap-4 items-center mb-4">
        <Tabs value={viewType} onValueChange={(value) => setViewType(value as "status" | "have_state")}>
          <TabsList>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="have_state">Have State</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="space-y-0">
          {viewType === "status" 
            ? STATUSES.map((status) => (
                <DroppableColumn
                  key={status}
                  id={status}
                  label={STATUS_LABELS[status]}
                  items={itemsByStatus[status] || []}
                  onEdit={handleEdit}
                  canManage={isOwner()}
                  onStatusChange={fetchItems}
                  onHaveStateChange={fetchItems}
                  viewType="status"
                />
              ))
            : HAVE_STATES.map((haveState) => (
                <DroppableColumn
                  key={haveState}
                  id={haveState}
                  label={HAVE_STATE_LABELS[haveState]}
                  items={itemsByHaveState[haveState] || []}
                  onEdit={handleEdit}
                  canManage={isOwner()}
                  onStatusChange={fetchItems}
                  onHaveStateChange={fetchItems}
                  viewType="have_state"
                />
              ))
          }
        </div>
      </DndContext>

      <RoadmapFormSheet open={sheetOpen} onOpenChange={setSheetOpen} item={editingItem} />
    </div>
  );
}
