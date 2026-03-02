import { useState } from "react";
import { Bell, Volume2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const NotificationSettings = () => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopEnabled, setDesktopEnabled] = useState(true);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [soundType, setSoundType] = useState("alert1");
  const [digestFreq, setDigestFreq] = useState("hourly");
  const { toast } = useToast();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notification Settings</h1>
          <p className="text-muted-foreground mt-1">Control how you receive alerts and updates</p>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-6 space-y-6">
        <h3 className="font-semibold text-foreground">In-App Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-primary" />
              <div><Label>Sound Alerts</Label><p className="text-xs text-muted-foreground">Play sound on new alert</p></div>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
          </div>
          {soundEnabled && (
            <div className="ml-8 space-y-2">
              <Label>Alert Sound</Label>
              <Select value={soundType} onValueChange={setSoundType}>
                <SelectTrigger className="w-[200px] bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alert1">Alert Tone 1</SelectItem>
                  <SelectItem value="alert2">Alert Tone 2</SelectItem>
                  <SelectItem value="alarm">Alarm</SelectItem>
                  <SelectItem value="chime">Chime</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-primary" />
              <div><Label>Desktop Notifications</Label><p className="text-xs text-muted-foreground">Browser push notifications</p></div>
            </div>
            <Switch checked={desktopEnabled} onCheckedChange={setDesktopEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <div><Label>Critical Only Mode</Label><p className="text-xs text-muted-foreground">Only show critical severity alerts</p></div>
            </div>
            <Switch checked={criticalOnly} onCheckedChange={setCriticalOnly} />
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-6 space-y-6">
        <h3 className="font-semibold text-foreground">Digest & Summary</h3>
        <div className="space-y-2">
          <Label>Email Digest Frequency</Label>
          <Select value={digestFreq} onValueChange={setDigestFreq}>
            <SelectTrigger className="w-[200px] bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">Real-time</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => toast({ title: "Preference synchronization complete" })} className="font-semibold">Save Settings</Button>
      </div>
    </div>
  );
};

export default NotificationSettings;
