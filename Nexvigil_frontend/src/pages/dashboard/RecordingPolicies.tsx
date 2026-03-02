import { useState } from "react";
import { Film, Clock, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const RecordingPolicies = () => {
  const [preDuration, setPreDuration] = useState([5]);
  const [postDuration, setPostDuration] = useState([30]);
  const [maxFileSize, setMaxFileSize] = useState("100");
  const [retention, setRetention] = useState("30");
  const [autoDelete, setAutoDelete] = useState(true);
  const [format, setFormat] = useState("mp4");
  const { toast } = useToast();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Film className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recording Policies</h1>
          <p className="text-muted-foreground mt-1">Configure event-triggered recording behavior</p>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-6 space-y-6">
        <h3 className="font-semibold text-foreground">Recording Duration</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Pre-Event Buffer: {preDuration[0]}s</Label>
            <Slider value={preDuration} onValueChange={setPreDuration} min={0} max={30} step={1} />
            <p className="text-xs text-muted-foreground">Seconds of footage before the trigger event</p>
          </div>
          <div className="space-y-2">
            <Label>Post-Event Duration: {postDuration[0]}s</Label>
            <Slider value={postDuration} onValueChange={setPostDuration} min={10} max={120} step={5} />
            <p className="text-xs text-muted-foreground">Seconds of footage after the trigger event</p>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-6 space-y-6">
        <h3 className="font-semibold text-foreground">Storage & Retention</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Max File Size (MB)</Label>
            <Input type="number" value={maxFileSize} onChange={e => setMaxFileSize(e.target.value)} className="bg-secondary border-border max-w-[200px]" />
          </div>
          <div className="space-y-2">
            <Label>Retention Period (days)</Label>
            <Input type="number" value={retention} onChange={e => setRetention(e.target.value)} className="bg-secondary border-border max-w-[200px]" />
          </div>
          <div className="space-y-2">
            <Label>Output Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="w-[200px] bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">MP4 (H.264)</SelectItem>
                <SelectItem value="webm">WebM (VP9)</SelectItem>
                <SelectItem value="avi">AVI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Delete Expired</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Automatically remove recordings past retention period</p>
            </div>
            <Switch checked={autoDelete} onCheckedChange={setAutoDelete} />
          </div>
        </div>
        <Button onClick={() => toast({ title: "Policy Modifications Persisted", description: "Event-triggered recording parameters have been updated." })} className="font-semibold">Save Policies</Button>
      </div>
    </div>
  );
};

export default RecordingPolicies;
