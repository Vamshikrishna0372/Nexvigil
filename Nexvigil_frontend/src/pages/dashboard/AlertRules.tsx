import { useState } from "react";
import { Plus, Trash2, Zap, Loader2, Pencil, Activity, Power, PowerOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Rule {
  id: string;
  _id?: string;
  rule_name: string;
  target_classes: string[];
  min_confidence: number;
  persistence_seconds: number;
  cooldown_seconds: number;
  severity: string;
  is_active: boolean;
  recording_enabled: boolean;
  recording_duration: number;
  owner_id?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-500 border-red-500/30 bg-red-500/5",
  high: "text-orange-500 border-orange-500/30 bg-orange-500/5",
  medium: "text-primary border-primary/30 bg-primary/5",
  low: "text-muted-foreground border-muted bg-muted/10",
};

const SEVERITY_BAR: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-primary",
  low: "bg-muted-foreground/40",
};

const getRuleId = (rule: Rule) => rule.id || rule._id || "";

const AlertRules = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [targetClasses, setTargetClasses] = useState("person");
  const [confidence, setConfidence] = useState([60]);
  const [persistence, setPersistence] = useState([2]);
  const [cooldown, setCooldown] = useState([10]);
  const [severity, setSeverity] = useState("medium");
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState([30]);

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: rules = [], isLoading } = useQuery<Rule[]>({
    queryKey: ["alert-rules"],
    queryFn: async () => {
      const { data, error } = await api.rules.list();
      if (error) throw new Error(error);
      const list = (data as any)?.data || data || [];
      return list.map((r: any) => ({ ...r, id: r.id || r._id }));
    },
    refetchInterval: 10000,
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: any) => api.rules.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      setOpen(false);
      resetForm();
      toast({ title: "✅ Rule Created", description: "Detection rule is now active." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create rule", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.rules.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      setOpen(false);
      resetForm();
      toast({ title: "✅ Rule Updated", description: "Changes saved successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update rule", description: err.message, variant: "destructive" });
    },
  });

  // Dedicated toggle mutation — uses PATCH /rules/{id}/toggle
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.rules.toggle(id, is_active),
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      toast({
        title: is_active ? "🟢 Rule Enabled" : "⚫ Rule Disabled",
        description: is_active
          ? "AI agent will now trigger alerts for this rule."
          : "No alerts will be triggered by this rule.",
      });
    },
    onError: (err: any) => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      toast({ title: "Toggle failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.rules.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      toast({ title: "🗑️ Rule Deleted", variant: "destructive" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete rule", description: err.message, variant: "destructive" });
    },
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const resetForm = () => {
    setName("");
    setTargetClasses("person");
    setConfidence([60]);
    setPersistence([2]);
    setCooldown([10]);
    setSeverity("medium");
    setRecordingEnabled(false);
    setRecordingDuration([30]);
    setIsEditing(false);
    setEditId("");
  };

  const openEdit = (rule: Rule) => {
    setIsEditing(true);
    setEditId(getRuleId(rule));
    setName(rule.rule_name);
    setTargetClasses((rule.target_classes || []).join(", "));
    // Normalize: backend stores as 0–1 float
    const confVal = rule.min_confidence > 1 ? rule.min_confidence : Math.round(rule.min_confidence * 100);
    setConfidence([confVal]);
    setPersistence([rule.persistence_seconds ?? 2]);
    setCooldown([rule.cooldown_seconds ?? 10]);
    setSeverity(rule.severity ?? "medium");
    setRecordingEnabled(!!rule.recording_enabled);
    setRecordingDuration([rule.recording_duration ?? 30]);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: "Rule name is required", variant: "destructive" });
      return;
    }
    const classesArray = targetClasses
      .split(",")
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);
    if (classesArray.length === 0) {
      toast({ title: "At least one target object is required", variant: "destructive" });
      return;
    }

    const payload = {
      rule_name: name.trim(),
      target_classes: classesArray,
      min_confidence: confidence[0] / 100,
      persistence_seconds: persistence[0],
      cooldown_seconds: cooldown[0],
      severity,
      recording_enabled: recordingEnabled,
      recording_duration: recordingDuration[0],
      is_active: true, // New rules are always active
    };

    if (isEditing && editId) {
      updateMutation.mutate({ id: editId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleToggle = (rule: Rule, checked: boolean) => {
    const id = getRuleId(rule);
    if (!id) return;
    // Optimistic update
    queryClient.setQueryData<Rule[]>(["alert-rules"], (prev) =>
      prev?.map((r) => (getRuleId(r) === id ? { ...r, is_active: checked } : r))
    );
    toggleMutation.mutate({ id, is_active: checked });
  };

  // ─── Loading Skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96 rounded-full" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-panel p-5 rounded-2xl border border-border/10">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-16 rounded-full" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activeCount = rules.filter((r) => r.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Rule Engine</h1>
          <p className="text-muted-foreground mt-1">
            {rules.length} rules total &mdash;{" "}
            <span className="text-emerald-500 font-medium">{activeCount} active</span>,{" "}
            <span className="text-muted-foreground/60">{rules.length - activeCount} paused</span>
          </p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(v) => {
            if (!v) resetForm();
            setOpen(v);
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => setIsEditing(false)}>
              <Plus className="w-4 h-4" /> New Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card/95 backdrop-blur-md border-border max-w-md">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit Detection Rule" : "Create Detection Rule"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Rule Name */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Rule Name *</Label>
                <Input
                  placeholder="e.g., Night Perimeter Watch"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-secondary/50 border-border focus:ring-primary"
                />
              </div>

              {/* Target Objects */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Target Objects *</Label>
                <Input
                  placeholder="e.g., person, car, dog"
                  value={targetClasses}
                  onChange={(e) => setTargetClasses(e.target.value)}
                  className="bg-secondary/50 border-border"
                />
                <p className="text-[10px] text-muted-foreground italic">
                  Comma-separated YOLO class names. Common: person, car, truck, motorcycle, dog, cat, bag
                </p>
              </div>

              {/* Confidence & Severity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Confidence: {confidence[0]}%</Label>
                  <Slider value={confidence} onValueChange={setConfidence} min={30} max={99} step={1} className="py-2" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Severity Level</Label>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger className="bg-secondary/50 border-border h-8 py-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Persistence & Cooldown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Persistence: {persistence[0]}s</Label>
                  <Slider value={persistence} onValueChange={setPersistence} min={0} max={30} step={1} className="py-2" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Cooldown: {cooldown[0]}s</Label>
                  <Slider value={cooldown} onValueChange={setCooldown} min={5} max={300} step={5} className="py-2" />
                </div>
              </div>

              {/* Auto-record toggle */}
              <div className="flex items-center justify-between mt-2 border-t border-border/40 pt-4">
                <div className="flex items-center gap-2">
                  <Switch checked={recordingEnabled} onCheckedChange={setRecordingEnabled} />
                  <Label className="text-sm cursor-pointer">Auto-Record on Trigger</Label>
                </div>
              </div>
              {recordingEnabled && (
                <div className="space-y-2 bg-secondary/30 p-3 rounded-lg border border-border/40">
                  <Label className="text-xs">Recording Duration: {recordingDuration[0]}s</Label>
                  <Slider value={recordingDuration} onValueChange={setRecordingDuration} min={5} max={120} step={5} />
                </div>
              )}

              <Button
                className="w-full mt-4"
                onClick={handleSubmit}
                disabled={updateMutation.isPending || createMutation.isPending || !name.trim()}
              >
                {updateMutation.isPending || createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isEditing ? (
                  "Save Changes"
                ) : (
                  "Create Rule"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules List */}
      <div className="grid grid-cols-1 gap-4">
        {rules.length === 0 ? (
          <div className="text-center py-20 glass-panel rounded-2xl border-dashed border-2 border-border/50">
            <Zap className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground italic">No AI rules yet. Click 'New Rule' to get started.</p>
          </div>
        ) : (
          rules.map((rule, i) => {
            const ruleId = getRuleId(rule);
            const isActive = rule.is_active;
            const isToggling = toggleMutation.isPending && toggleMutation.variables?.id === ruleId;

            return (
              <motion.div
                key={ruleId || i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  "glass-panel rounded-2xl p-5 border border-border/40 hover:border-primary/30 transition-all group relative overflow-hidden",
                  !isActive && "opacity-60"
                )}
              >
                {/* Severity sidebar */}
                <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", SEVERITY_BAR[rule.severity] ?? "bg-muted")} />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Info section */}
                  <div className="flex items-start gap-4 min-w-0">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0 border border-border/60 transition-colors",
                        isActive ? "border-primary/30" : "border-border/30"
                      )}
                    >
                      <Zap className={cn("w-6 h-6 transition-colors", isActive ? "text-primary" : "text-muted-foreground/40")} />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-lg truncate">{rule.rule_name}</span>
                        <Badge
                          variant="outline"
                          className={cn(SEVERITY_COLORS[rule.severity], "text-[10px] uppercase font-bold px-2 py-0")}
                        >
                          {rule.severity}
                        </Badge>
                        {!isActive && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted uppercase font-bold px-2 py-0">
                            PAUSED
                          </Badge>
                        )}
                        {rule.recording_enabled && (
                          <Badge variant="outline" className="border-red-500/40 text-red-500 bg-red-500/5 text-[10px] font-bold px-2 py-0 animate-pulse">
                            REC {rule.recording_duration}s
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                        <p>
                          Detects:{" "}
                          <span className="text-foreground/80 font-medium capitalize">
                            {(rule.target_classes || []).join(", ") || "—"}
                          </span>
                        </p>
                        <span className="text-border hidden sm:inline">|</span>
                        <p>
                          Min Conf:{" "}
                          <span className="text-primary font-mono">
                            {Math.round((rule.min_confidence > 1 ? rule.min_confidence / 100 : rule.min_confidence) * 100)}%
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-3 mt-1 flex-wrap">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary/40 px-2 py-0.5 rounded-full">
                          <Activity className="w-3 h-3" />
                          Wait: {rule.persistence_seconds}s
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary/40 px-2 py-0.5 rounded-full">
                          <Loader2 className="w-3 h-3" />
                          Cool: {rule.cooldown_seconds}s
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4 ml-auto md:ml-0 self-end md:self-center shrink-0">
                    {/* Toggle */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                        {isActive ? "Active" : "Paused"}
                      </span>
                      {isToggling ? (
                        <div className="h-6 w-11 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        </div>
                      ) : (
                        <Switch
                          checked={isActive}
                          onCheckedChange={(checked) => handleToggle(rule, checked)}
                        />
                      )}
                    </div>

                    <div className="h-10 w-px bg-border/40 hidden md:block" />

                    {/* Edit */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full hover:bg-secondary text-primary"
                      onClick={() => openEdit(rule)}
                      title="Edit rule"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>

                    {/* Delete */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full hover:bg-red-500/10 text-destructive"
                          title="Delete rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Rule</AlertDialogTitle>
                          <AlertDialogDescription>
                            Permanently delete "<strong>{rule.rule_name}</strong>"? This cannot be undone and will stop all
                            related detections and alerts immediately.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(ruleId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AlertRules;
