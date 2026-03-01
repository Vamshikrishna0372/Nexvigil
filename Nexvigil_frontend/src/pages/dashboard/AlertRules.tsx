import { useState } from "react";
import { Plus, Trash2, Zap, AlertTriangle, Loader2, Pencil, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";

import { Skeleton } from "@/components/ui/skeleton";

const AlertRules = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Form State (shared between Create and Edit)
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState("");
  const [name, setName] = useState("");
  const [targetClasses, setTargetClasses] = useState("person");
  const [confidence, setConfidence] = useState([60]);
  const [persistence, setPersistence] = useState([2]);
  const [cooldown, setCooldown] = useState([10]);
  const [severity, setSeverity] = useState("medium");
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState([30]);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["alert-rules"],
    queryFn: async () => {
      const { data } = await api.rules.list();
      const list = (data as any)?.data || data || [];
      return list;
    },
    refetchInterval: 5000
  });

  const createMutation = useMutation({
    mutationFn: (newRule: any) => api.rules.create(newRule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      setOpen(false);
      resetForm();
      toast({ title: "Rule created", description: "The detection rule is now active." });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.rules.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      setOpen(false);
      resetForm();
      toast({ title: "Rule updated", description: "Changes saved successfully." });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.rules.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      toast({ title: "Rule deleted", variant: "destructive" });
    }
  });

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96 rounded-full" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="glass-panel p-5 rounded-2xl border border-border/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-64" />
                  <div className="flex gap-4">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

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

  const openEdit = (rule: any) => {
    setIsEditing(true);
    setEditId(rule.id || rule._id);
    setName(rule.rule_name || rule.name);
    setTargetClasses(rule.target_classes?.join(", ") || "person");
    setConfidence([Math.round((rule.min_confidence > 1 ? rule.min_confidence / 100 : rule.min_confidence) * 100)]);
    setPersistence([rule.persistence_seconds || 2]);
    setCooldown([rule.cooldown_seconds || 10]);
    setSeverity(rule.severity || "medium");
    setRecordingEnabled(!!rule.recording_enabled);
    setRecordingDuration([rule.recording_duration || 30]);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    const classesArray = targetClasses.split(",").map(c => c.trim().toLowerCase()).filter(c => c);
    const data = {
      rule_name: name,
      target_classes: classesArray,
      min_confidence: confidence[0] / 100,
      persistence_seconds: persistence[0],
      cooldown_seconds: cooldown[0],
      severity,
      recording_enabled: recordingEnabled,
      recording_duration: recordingDuration[0],
      is_active: true
    };

    if (isEditing) {
      updateMutation.mutate({ id: editId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const severityColors: Record<string, string> = {
    critical: "text-red-500 border-red-500/30 bg-red-500/5",
    high: "text-orange-500 border-orange-500/30 bg-orange-500/5",
    medium: "text-primary border-primary/30 bg-primary/5",
    low: "text-muted-foreground border-muted bg-muted/5",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Rule Engine</h1>
          <p className="text-muted-foreground mt-1">Manage detections and automated recording policies</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
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
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Rule Name</Label>
                <Input
                  placeholder="e.g., Night Perimeter Watch"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-secondary/50 border-border focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Target Objects</Label>
                <Input
                  placeholder="e.g., person, car, dog"
                  value={targetClasses}
                  onChange={(e) => setTargetClasses(e.target.value)}
                  className="bg-secondary/50 border-border"
                />
                <p className="text-[10px] text-muted-foreground italic">Separated by commas</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Confidence: {confidence[0]}%</Label>
                  <Slider value={confidence} onValueChange={setConfidence} min={30} max={99} step={1} className="py-2" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Severity Level</Label>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger className="bg-secondary/50 border-border h-8 py-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Persistence: {persistence[0]}s</Label>
                  <Slider value={persistence} onValueChange={setPersistence} min={0} max={30} step={1} className="py-2" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Cooldown: {cooldown[0]}s</Label>
                  <Slider value={cooldown} onValueChange={setCooldown} min={5} max={120} step={5} className="py-2" />
                </div>
              </div>
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
                disabled={updateMutation.isPending || createMutation.isPending || !name}
              >
                {(updateMutation.isPending || createMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEditing ? "Save Changes" : "Create Rule")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rules.length === 0 ? (
          <div className="text-center py-20 glass-panel rounded-2xl border-dashed border-2 border-border/50">
            <Zap className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground italic">No AI rules active. Click 'New Rule' to start.</p>
          </div>
        ) : (
          rules.map((rule: any, i: number) => (
            <motion.div
              key={rule.id || rule._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "glass-panel rounded-2xl p-5 border border-border/40 hover:border-primary/30 transition-all group relative overflow-hidden",
                !(rule.is_active ?? rule.active) && "opacity-60 grayscale-[0.5]"
              )}
            >
              {/* Decorative side bar based on severity */}
              <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1.5",
                rule.severity === 'critical' ? 'bg-red-500' :
                  rule.severity === 'high' ? 'bg-orange-500' :
                    rule.severity === 'medium' ? 'bg-primary' : 'bg-muted'
              )} />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0 border border-border/60">
                    <Zap className={cn("w-6 h-6", (rule.is_active ?? rule.active) ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-lg">{rule.rule_name || rule.name}</span>
                      <Badge variant="outline" className={cn(severityColors[rule.severity], "text-[10px] uppercase font-bold px-2 py-0")}>
                        {rule.severity}
                      </Badge>
                      {rule.recording_enabled && (
                        <Badge variant="outline" className="border-red-500/40 text-red-500 bg-red-500/5 text-[10px] font-bold px-2 py-0 animate-pulse">
                          REC {rule.recording_duration}s
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <p>
                        Detects: <span className="text-foreground/80 font-medium capitalize">{(rule.target_classes || []).join(", ")}</span>
                      </p>
                      <span className="text-border">|</span>
                      <p>Min Conf: <span className="text-primary font-mono">{Math.round((rule.min_confidence > 1 ? rule.min_confidence / 100 : rule.min_confidence) * 100)}%</span></p>
                    </div>
                    <div className="flex gap-4 mt-2">
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

                <div className="flex items-center gap-4 ml-auto md:ml-0 self-end md:self-center">
                  <div className="flex flex-col items-end gap-1 mr-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Status</span>
                    <Switch
                      checked={rule.is_active ?? rule.active}
                      onCheckedChange={(checked) => updateMutation.mutate({ id: rule.id || rule._id, data: { is_active: checked, active: checked } })}
                    />
                  </div>
                  <div className="h-10 w-px bg-border/40 mx-2 hidden md:block" />
                  <div className="flex gap-2">
                    <Button
                      variant="ghost" size="icon"
                      className="rounded-full hover:bg-secondary text-primary"
                      onClick={() => openEdit(rule)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="rounded-full hover:bg-red-500/10 text-destructive"
                      onClick={() => deleteMutation.mutate(rule.id || rule._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};


export default AlertRules;
