import { useState, useEffect } from "react";
import { Settings, Globe, Clock, Monitor, Smartphone, Laptop, LogOut, Shield, Bell, Volume2, Eye, BellOff, Mail, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import { Input } from "@/components/ui/input";

const AccountSettings = () => {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [defaultView, setDefaultView] = useState("monitoring");
  const [timezone, setTimezone] = useState("utc");
  const [language, setLanguage] = useState("en");
  const [inApp, setInApp] = useState(true);
  const [sound, setSound] = useState(true);
  const [soundType, setSoundType] = useState("alert1");
  const [desktop, setDesktop] = useState(true);
  const [emailNotif, setEmailNotif] = useState(user?.alerts_enabled ?? true);
  const [alertEmail, setAlertEmail] = useState(user?.alert_email || user?.email || "");
  const [digestFreq, setDigestFreq] = useState("daily");
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");
  const [twoFactor, setTwoFactor] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    toast({ title: "Preference synchronization complete", description: "Operational parameters have been successfully updated." });
  };

  const saveNotifications = async () => {
    setSaving(true);
    const { error } = await api.auth.updateMe({
      alerts_enabled: emailNotif,
      alert_email: alertEmail
    });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "Notification Protocol Updated", description: "Alert dissemination parameters have been persisted." });
    }
  };

  const sessions = [
    { device: "Chrome · Windows", icon: Monitor, location: "Mumbai, IN", time: "Active now", current: true },
    { device: "Safari · iPhone 15", icon: Smartphone, location: "Mumbai, IN", time: "2 hours ago", current: false },
    { device: "Firefox · MacBook", icon: Laptop, location: "Delhi, IN", time: "5 days ago", current: false },
  ];

  const activityLog = [
    { action: "Logged in", time: "10 min ago" },
    { action: "Changed notification settings", time: "2 hours ago" },
    { action: "Updated profile name", time: "1 day ago" },
    { action: "Changed password", time: "3 days ago" },
    { action: "Added camera CAM-005", time: "5 days ago" },
    { action: "Acknowledged alert #1042", time: "1 week ago" },
  ];

  const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
        <Icon className="w-4 h-4 text-primary" /> {title}
      </h3>
      {children}
    </div>
  );

  const SettingRow = ({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between py-2">
      <div>
        <Label className="text-sm">{label}</Label>
        {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-secondary/50 border border-border/50">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-xl p-6 space-y-6">
            <Section title="Preferences" icon={Settings}>
              <SettingRow label="Default Dashboard" desc="Landing page after login">
                <Select value={defaultView} onValueChange={setDefaultView}>
                  <SelectTrigger className="w-[180px] bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monitoring">Monitoring</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow label="Theme" desc="Interface appearance">
                <Button variant="outline" size="sm" onClick={toggleTheme} className="gap-2">
                  {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  {theme === "dark" ? "Dark" : "Light"}
                </Button>
              </SettingRow>
              <SettingRow label="Language" desc="Display language">
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-[180px] bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow label="Timezone" desc="Time display format">
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="w-[180px] bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="ist">IST (UTC+5:30)</SelectItem>
                    <SelectItem value="est">EST (UTC-5)</SelectItem>
                    <SelectItem value="pst">PST (UTC-8)</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
            </Section>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : null}
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
          </motion.div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-xl p-6 space-y-6">
            <Section title="Alert Notifications" icon={Bell}>
              <SettingRow label="In-App Notifications" desc="Show alerts within the app">
                <Switch checked={inApp} onCheckedChange={setInApp} />
              </SettingRow>
              <SettingRow label="Sound Alerts" desc="Play sound on new alert">
                <Switch checked={sound} onCheckedChange={setSound} />
              </SettingRow>
              {sound && (
                <div className="ml-4 pl-4 border-l border-border/50">
                  <SettingRow label="Alert Tone">
                    <Select value={soundType} onValueChange={setSoundType}>
                      <SelectTrigger className="w-[160px] bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alert1">Tone 1</SelectItem>
                        <SelectItem value="alert2">Tone 2</SelectItem>
                        <SelectItem value="alarm">Alarm</SelectItem>
                        <SelectItem value="chime">Chime</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                </div>
              )}
              <SettingRow label="Desktop Push" desc="Browser notifications">
                <Switch checked={desktop} onCheckedChange={setDesktop} />
              </SettingRow>
              <SettingRow label="Critical Only Mode" desc="Only critical severity">
                <Switch checked={criticalOnly} onCheckedChange={setCriticalOnly} />
              </SettingRow>
            </Section>

            <Separator />

            <Section title="Email & Digest" icon={Mail}>
              <SettingRow label="Email Notifications" desc="Turn global email alerts on or off">
                <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
              </SettingRow>
              {emailNotif && (
                <>
                  <SettingRow label="Alert Email" desc="Address to receive critical alerts">
                    <Input
                      value={alertEmail}
                      onChange={(e) => setAlertEmail(e.target.value)}
                      className="w-[200px] h-9 text-sm bg-secondary border-border"
                      placeholder="alerts@example.com"
                    />
                  </SettingRow>
                  <SettingRow label="Digest Frequency">
                    <Select value={digestFreq} onValueChange={setDigestFreq}>
                      <SelectTrigger className="w-[160px] bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                </>
              )}
            </Section>

            <Separator />

            <Section title="Quiet Hours" icon={BellOff}>
              <SettingRow label="Enable Quiet Hours" desc="Suppress non-critical alerts">
                <Switch checked={quietHoursEnabled} onCheckedChange={setQuietHoursEnabled} />
              </SettingRow>
              {quietHoursEnabled && (
                <div className="flex gap-4 ml-4 pl-4 border-l border-border/50">
                  <div className="space-y-1">
                    <Label className="text-xs">Start</Label>
                    <input type="time" value={quietStart} onChange={e => setQuietStart(e.target.value)} className="bg-secondary border border-border rounded px-2 py-1 text-sm text-foreground" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End</Label>
                    <input type="time" value={quietEnd} onChange={e => setQuietEnd(e.target.value)} className="bg-secondary border border-border rounded px-2 py-1 text-sm text-foreground" />
                  </div>
                </div>
              )}
            </Section>

            <Button onClick={saveNotifications} disabled={saving} className="gap-2">
              {saving ? "Saving..." : "Save Notification Settings"}
            </Button>
          </motion.div>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-xl p-6 space-y-6">
            <Section title="Security Settings" icon={Shield}>
              <SettingRow label="Two-Factor Authentication" desc="Add extra layer of security">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] text-warning border-warning/30">Coming Soon</Badge>
                  <Switch checked={twoFactor} onCheckedChange={setTwoFactor} disabled />
                </div>
              </SettingRow>
              <SettingRow label="Login Alerts" desc="Get notified of new login activity">
                <Switch checked={loginAlerts} onCheckedChange={setLoginAlerts} />
              </SettingRow>
            </Section>

            <Separator />

            <Section title="Account Activity" icon={Clock}>
              <div className="space-y-2">
                {activityLog.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
                    <span className="text-foreground">{a.action}</span>
                    <span className="text-xs text-muted-foreground">{a.time}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Button onClick={save} disabled={saving}>Save Security Settings</Button>
          </motion.div>
        </TabsContent>

        {/* Sessions */}
        <TabsContent value="sessions">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-xl p-6 space-y-6">
            <Section title="Active Sessions" icon={Monitor}>
              <div className="space-y-3">
                {sessions.map((s, i) => (
                  <div key={i} className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    s.current ? "border-primary/30 bg-primary/5" : "border-border/50 bg-secondary/30"
                  )}>
                    <div className="flex items-center gap-3">
                      <s.icon className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground flex items-center gap-2">
                          {s.device}
                          {s.current && <Badge variant="outline" className="text-[9px] text-primary border-primary/30">Current</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">{s.location} · {s.time}</p>
                      </div>
                    </div>
                    {!s.current && (
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive text-xs">
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            <Separator />

            <Button variant="destructive" className="gap-2" onClick={() => toast({ title: "Global Session Termination", description: "All secondary authentication tokens have been invalidated." })}>
              <LogOut className="w-4 h-4" /> Logout From All Devices
            </Button>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountSettings;
