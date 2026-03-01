import { useState } from "react";
import { BellRing, Mail, MessageSquare, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const AlertConfig = () => {
  const [cooldown, setCooldown] = useState("60");
  const [maxPerHour, setMaxPerHour] = useState("50");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [slackEnabled, setSlackEnabled] = useState(true);
  const [escalation, setEscalation] = useState("5");
  const { toast } = useToast();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BellRing className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alert Configuration</h1>
          <p className="text-muted-foreground mt-1">Manage alert delivery channels and thresholds</p>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-6 space-y-6">
        <h3 className="font-semibold text-foreground">Delivery Channels</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <Label>Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Send alerts to admin@nexvigil.com</p>
              </div>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-primary" />
              <div>
                <Label>SMS Alerts</Label>
                <p className="text-xs text-muted-foreground">Critical alerts via text message</p>
              </div>
            </div>
            <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-primary" />
              <div>
                <Label>Slack Integration</Label>
                <p className="text-xs text-muted-foreground">Post to #security-alerts channel</p>
              </div>
            </div>
            <Switch checked={slackEnabled} onCheckedChange={setSlackEnabled} />
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-6 space-y-6">
        <h3 className="font-semibold text-foreground">Rate Limits & Escalation</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Alert Cooldown (seconds)</Label>
            <Input type="number" value={cooldown} onChange={e => setCooldown(e.target.value)} className="bg-secondary border-border max-w-[200px]" />
            <p className="text-xs text-muted-foreground">Minimum time between duplicate alerts</p>
          </div>
          <div className="space-y-2">
            <Label>Max Alerts per Hour</Label>
            <Input type="number" value={maxPerHour} onChange={e => setMaxPerHour(e.target.value)} className="bg-secondary border-border max-w-[200px]" />
          </div>
          <div className="space-y-2">
            <Label>Auto-Escalation After (minutes)</Label>
            <Input type="number" value={escalation} onChange={e => setEscalation(e.target.value)} className="bg-secondary border-border max-w-[200px]" />
            <p className="text-xs text-muted-foreground">Unacknowledged critical alerts escalate after this time</p>
          </div>
        </div>
        <Button onClick={() => toast({ title: "Configuration saved" })} className="font-semibold">Save Configuration</Button>
      </div>
    </div>
  );
};

export default AlertConfig;
