import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/use-toast";
import { Target, Save, Loader2, Mail, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const Settings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["ai-config"],
    queryFn: async () => {
      const { data } = await api.system.aiConfig.get();
      return data || {
        confidence_threshold: 0.5,
        frame_skip: 5,
        recording_persistence_seconds: 3,
        model_type: "yolov8n",
        use_gpu: false,
        cool_down_seconds: 30
      };
    }
  });

  const [localConfig, setLocalConfig] = useState<any>(null);

  useEffect(() => {
    if (config) setLocalConfig(config);
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => api.system.aiConfig.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-config"] });
      queryClient.invalidateQueries({ queryKey: ["email-status"] });
      toast({ title: "Configuration Persisted", description: "AI engine parameters have been successfully updated." });
    },
    onError: () => {
      toast({ title: "Persistence Failure", description: "System was unable to synchronize configuration changes.", variant: "destructive" });
    }
  });

  const { data: emailStatus, refetch: refetchEmailStatus, isFetching: isCheckingEmail } = useQuery({
    queryKey: ["email-status"],
    queryFn: async () => {
      const { data } = await api.system.aiConfig.emailStatus();
      return data as any;
    },
    staleTime: 60000, // check once a minute max
  });

  const testEmailMutation = useMutation({
    mutationFn: async (recipient: string) => api.system.aiConfig.emailTest(recipient),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast({ title: "Transmission Verified", description: "A verification packet has been dispatched to the target address." });
      } else {
        toast({ title: "SMTP Protocol Violation", description: res?.message || "Internal relay mechanism failure.", variant: "destructive" });
      }
    },
    onError: (err: any) => {
      toast({ title: "Credential Validation Failed", description: err.error || "Authentication with relay service was rejected.", variant: "destructive" });
    }
  });

  if (isLoading || !localConfig) return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 rounded-full" />
        </div>
      </div>
      <div className="glass-panel rounded-xl p-8 border border-border/10 space-y-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
        <Skeleton className="h-10 w-32 rounded-md mt-6" />
      </div>
    </div>
  );

  const handleSliderChange = (val: number[]) => {
    setLocalConfig({ ...localConfig, confidence_threshold: val[0] / 100 });
  };

  const handleSave = () => {
    updateMutation.mutate(localConfig);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Target className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Configuration</h1>
          <p className="text-muted-foreground mt-1 text-sm">Configure detection engine parameters</p>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-6 border border-border/10 space-y-6">
        <div className="space-y-3">
          <Label>AI Model Type</Label>
          <Select
            value={localConfig.model_type}
            onValueChange={(v) => setLocalConfig({ ...localConfig, model_type: v })}
          >
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yolov8n">YOLOv8 Nano (Fastest)</SelectItem>
              <SelectItem value="yolov8s">YOLOv8 Small (Balanced)</SelectItem>
              <SelectItem value="yolov8m">YOLOv8 Medium (Accurate)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Select the model suited for your hardware capacity.</p>
        </div>

        <div className="space-y-3">
          <Label>Confidence Threshold ({(localConfig.confidence_threshold * 100).toFixed(0)}%)</Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[localConfig.confidence_threshold * 100]}
              onValueChange={handleSliderChange}
              min={10} max={95} step={1}
              className="flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">Objects detected with lower confidence will be ignored.</p>
        </div>

        <div className="space-y-3">
          <Label>Frame Skip (Process every {localConfig.frame_skip} frames)</Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[localConfig.frame_skip]}
              onValueChange={(v) => setLocalConfig({ ...localConfig, frame_skip: v[0] })}
              min={1} max={30} step={1}
              className="flex-1"
            />
            <span className="font-mono text-sm">{localConfig.frame_skip}</span>
          </div>
          <p className="text-xs text-muted-foreground">Higher values reduce CPU usage but may miss fast moving objects.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Recording Trigger (sec)</Label>
            <Input
              type="number"
              value={localConfig.recording_persistence_seconds}
              onChange={(e) => setLocalConfig({ ...localConfig, recording_persistence_seconds: parseInt(e.target.value) || 0 })}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-2">
            <Label>Alert Cool Down (sec)</Label>
            <Input
              type="number"
              value={localConfig.cool_down_seconds}
              onChange={(e) => setLocalConfig({ ...localConfig, cool_down_seconds: parseInt(e.target.value) || 0 })}
              className="bg-secondary border-border"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            <Label>GPU Acceleration</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Use server CUDA cores if available</p>
          </div>
          <Switch
            checked={localConfig.use_gpu}
            onCheckedChange={(c) => setLocalConfig({ ...localConfig, use_gpu: c })}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Email Notifications</h2>
          <p className="text-muted-foreground mt-1 text-sm">Configure SMTP alert triggers and safety limits</p>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-6 border border-border/10 space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-border/5">
          <div>
            <Label className="text-base">Master Email Alerts</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Send professional email reports for critical security events</p>
          </div>
          <Switch
            checked={localConfig.email_notifications_enabled}
            onCheckedChange={(c) => setLocalConfig({ ...localConfig, email_notifications_enabled: c })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2 border-b border-border/5 mb-4">
          <div className="space-y-3">
            <Label>Sender Gmail Address</Label>
            <div className="relative">
              <Input
                placeholder="your.email@gmail.com"
                value={localConfig.sender_email || ""}
                onChange={(e) => setLocalConfig({ ...localConfig, sender_email: e.target.value })}
                className="bg-secondary border-border pl-10 h-11"
              />
              <Mail className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">The Gmail account that will send the alerts.</p>
          </div>

          <div className="space-y-3">
            <Label>Gmail App Password</Label>
            <Input
              type="password"
              placeholder="xxxx xxxx xxxx xxxx"
              value={localConfig.sender_app_password || ""}
              onChange={(e) => setLocalConfig({ ...localConfig, sender_app_password: e.target.value })}
              className="bg-secondary border-border h-11 font-mono tracking-wider"
            />
            <p className="text-xs text-muted-foreground">Generated from Google Account Security. <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-primary hover:underline">Get App Password</a></p>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Recipient Analysis Report Address</Label>
          <div className="relative">
            <Input
              placeholder="security@example.com"
              value={localConfig.recipient_email}
              onChange={(e) => setLocalConfig({ ...localConfig, recipient_email: e.target.value })}
              className="bg-secondary border-border pl-10 h-11"
            />
            <Mail className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">The primary destination for AI critical alerts and evidence reports.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label>Email Cool Down (min)</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                value={localConfig.email_cooldown_minutes}
                onChange={(e) => setLocalConfig({ ...localConfig, email_cooldown_minutes: parseInt(e.target.value) || 0 })}
                className="bg-secondary border-border h-10"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">per node</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Prevents flooding for persistent critical detections.</p>
          </div>

          <div className="space-y-3">
            <Label>Daily Max Emails</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                value={localConfig.email_daily_limit}
                onChange={(e) => setLocalConfig({ ...localConfig, email_daily_limit: parseInt(e.target.value) || 0 })}
                className="bg-secondary border-border h-10"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">limit</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Safety threshold to stay within Gmail daily limits.</p>
          </div>
        </div>

        <div className="pt-4 border-t border-border/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Notification Parameters
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto gap-2 bg-secondary hover:bg-secondary/80 border-border"
                onClick={() => testEmailMutation.mutate(localConfig.recipient_email)}
                disabled={testEmailMutation.isPending || !localConfig.recipient_email}
              >
                {testEmailMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send Test Email
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">SMTP Status:</span>
              {isCheckingEmail ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full border border-border/50">
                  <Loader2 className="w-3 h-3 animate-spin" /> Verifying...
                </div>
              ) : emailStatus?.success ? (
                <div className="flex items-center gap-1.5 text-xs text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">
                  <CheckCircle className="w-3.5 h-3.5" /> Gmail Connected
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-2.5 py-1 rounded-full border border-destructive/20" title={emailStatus?.message || "Check your app password and .env settings"}>
                  <XCircle className="w-3.5 h-3.5" /> Not Connected
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
