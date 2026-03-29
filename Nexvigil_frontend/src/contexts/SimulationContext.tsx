import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface SimAlert {
  id: string;
  object: string;
  camera: string;
  cameraOwner: string;
  confidence: number;
  severity: "critical" | "high" | "medium" | "low";
  timestamp: Date;
  read: boolean;
  acknowledged: boolean;
}

export interface SimCamera {
  id: string;
  name: string;
  owner: string;
  ownerId: string;
  status: "online" | "offline";
  lastActive: Date;
  location: string;
  recording: boolean;
  detection: string | null;
  fps: number;
}

interface AIEngineState {
  online: boolean;
  lastHeartbeat: Date;
  modelVersion: string;
  currentFps: number;
  accuracy: number;
}

export interface SimUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  cameras: number;
  lastLogin: string;
  status: "active" | "inactive";
}

interface SimulationContextType {
  alerts: SimAlert[];
  cameras: SimCamera[];
  aiEngine: AIEngineState;
  riskScore: number;
  unreadCount: number;
  criticalCount: number;
  activeCameraCount: number;
  users: SimUser[];
  markAlertRead: (id: string) => void;
  markAllRead: () => void;
  acknowledgeAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
  toggleAIEngine: () => void;
  toggleCamera: (id: string) => void;
  deleteCamera: (id: string) => void;
  updateCamera: (id: string, data: Partial<SimCamera>) => void;
  addCamera: (data: { name: string; url: string; location: string; ownerId: string; owner: string }) => void;
  updateUser: (id: string, data: Partial<SimUser>) => void;
  deleteUser: (id: string) => void;
  addUser: (data: Omit<SimUser, "id">) => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

const OBJECTS = ["Person", "Vehicle", "Weapon", "Animal"];
const SEVERITIES: SimAlert["severity"][] = ["low", "medium", "high", "critical"];
const CAMERA_NAMES = ["Front Gate", "Parking Lot A", "Main Entrance", "Back Alley", "Lobby", "Server Room", "Parking Lot B", "Warehouse", "Rooftop", "Loading Dock", "Reception", "Emergency Exit"];

const initialCameras: SimCamera[] = [
  { id: "cam1", name: "Front Gate", owner: "System Administrator", ownerId: "1", status: "online", lastActive: new Date(), location: "Building A – Entrance", recording: false, detection: null, fps: 30 },
  { id: "cam2", name: "Parking Lot A", owner: "System Administrator", ownerId: "1", status: "online", lastActive: new Date(), location: "Parking Zone A", recording: false, detection: null, fps: 28 },
  { id: "cam3", name: "Main Entrance", owner: "System Administrator", ownerId: "1", status: "online", lastActive: new Date(), location: "Main Building – Lobby", recording: true, detection: "Person — 94%", fps: 30 },
  { id: "cam4", name: "Back Alley", owner: "System Administrator", ownerId: "1", status: "offline", lastActive: new Date(Date.now() - 2700000), location: "Building A – Rear", recording: false, detection: null, fps: 0 },
  { id: "cam5", name: "Lobby", owner: "John Doe", ownerId: "2", status: "online", lastActive: new Date(), location: "Main Building – Floor 1", recording: false, detection: null, fps: 30 },
  { id: "cam6", name: "Server Room", owner: "John Doe", ownerId: "2", status: "online", lastActive: new Date(), location: "Basement – B1", recording: false, detection: null, fps: 25 },
  { id: "cam7", name: "Parking Lot B", owner: "Sarah Miller", ownerId: "3", status: "offline", lastActive: new Date(Date.now() - 10800000), location: "Parking Zone B", recording: false, detection: null, fps: 0 },
  { id: "cam8", name: "Warehouse", owner: "Sarah Miller", ownerId: "3", status: "online", lastActive: new Date(), location: "Warehouse – Main", recording: false, detection: null, fps: 22 },
  { id: "cam9", name: "Rooftop", owner: "Mike Johnson", ownerId: "4", status: "online", lastActive: new Date(), location: "Rooftop – Level 5", recording: false, detection: null, fps: 30 },
  { id: "cam10", name: "Loading Dock", owner: "Emily Chen", ownerId: "5", status: "online", lastActive: new Date(), location: "Warehouse – Dock", recording: false, detection: null, fps: 26 },
  { id: "cam11", name: "Reception", owner: "Emily Chen", ownerId: "5", status: "online", lastActive: new Date(), location: "Main Building – Ground", recording: false, detection: null, fps: 30 },
  { id: "cam12", name: "Emergency Exit", owner: "Emily Chen", ownerId: "5", status: "online", lastActive: new Date(), location: "Building A – East Wing", recording: false, detection: null, fps: 28 },
];

const generateAlert = (cameras: SimCamera[]): SimAlert => {
  const onlineCams = cameras.filter(c => c.status === "online");
  const cam = onlineCams[Math.floor(Math.random() * onlineCams.length)] || cameras[0];
  const obj = OBJECTS[Math.floor(Math.random() * OBJECTS.length)];
  const severity = obj === "Weapon" ? "critical" : SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
  return {
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    object: obj,
    camera: cam.name,
    cameraOwner: cam.ownerId,
    confidence: Math.floor(Math.random() * 18 + 80),
    severity,
    timestamp: new Date(),
    read: false,
    acknowledged: false,
  };
};

// Seed initial alerts
const seedAlerts = (cameras: SimCamera[]): SimAlert[] => {
  const now = Date.now();
  return Array.from({ length: 15 }, (_, i) => {
    const cam = cameras[i % cameras.length];
    const obj = OBJECTS[i % OBJECTS.length];
    return {
      id: `seed-${i}`,
      object: obj,
      camera: cam.name,
      cameraOwner: cam.ownerId,
      confidence: Math.floor(Math.random() * 18 + 80),
      severity: obj === "Weapon" ? "critical" as const : SEVERITIES[i % SEVERITIES.length],
      timestamp: new Date(now - (i * 180000)),
      read: i > 4,
      acknowledged: i > 8,
    };
  });
};

const initialUsers: SimUser[] = [
  { id: "1", name: "System Administrator", email: "admin@gmail.com", role: "admin", cameras: 4, lastLogin: "2 min ago", status: "active" },
  { id: "2", name: "John Doe", email: "john@company.com", role: "user", cameras: 2, lastLogin: "1 hr ago", status: "active" },
  { id: "3", name: "Sarah Miller", email: "sarah@company.com", role: "user", cameras: 2, lastLogin: "3 hr ago", status: "active" },
  { id: "4", name: "Mike Johnson", email: "mike@company.com", role: "user", cameras: 1, lastLogin: "1 day ago", status: "inactive" },
  { id: "5", name: "Emily Chen", email: "emily@company.com", role: "user", cameras: 3, lastLogin: "5 hr ago", status: "active" },
];

export const SimulationProvider = ({ children }: { children: ReactNode }) => {
  const [cameras, setCameras] = useState<SimCamera[]>(initialCameras);
  const [alerts, setAlerts] = useState<SimAlert[]>(() => seedAlerts(initialCameras));
  const [users, setUsers] = useState<SimUser[]>(initialUsers);
  const [aiEngine, setAIEngine] = useState<AIEngineState>({
    online: true,
    lastHeartbeat: new Date(),
    modelVersion: "YOLOv8n",
    currentFps: 30,
    accuracy: 94.7,
  });
  const [riskScore, setRiskScore] = useState(72);

  // Requirement: DISABLE DEMO SIMULATION (Rely on Real AI Agent)
  useEffect(() => {
    // Random alert generation is now disabled to maintain professional data integrity.
    return;
  }, [aiEngine.online, cameras]);

  useEffect(() => {
    if (!aiEngine.online) return;
    const interval = setInterval(() => {
      setAIEngine(prev => ({ ...prev, lastHeartbeat: new Date(), currentFps: Math.floor(28 + Math.random() * 4) }));
    }, 5000);
    return () => clearInterval(interval);
  }, [aiEngine.online]);

  const markAlertRead = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  }, []);
  const markAllRead = useCallback(() => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  }, []);
  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  }, []);
  const deleteAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);
  const toggleAIEngine = useCallback(() => {
    setAIEngine(prev => ({ ...prev, online: !prev.online, lastHeartbeat: new Date(), currentFps: !prev.online ? 30 : 0 }));
  }, []);
  const toggleCamera = useCallback((id: string) => {
    setCameras(prev => prev.map(c =>
      c.id === id ? { ...c, status: c.status === "online" ? "offline" : "online", lastActive: new Date(), fps: c.status === "online" ? 0 : 28, detection: null, recording: false } : c
    ));
  }, []);

  const deleteCamera = useCallback((id: string) => {
    setCameras(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateCamera = useCallback((id: string, data: Partial<SimCamera>) => {
    setCameras(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, []);

  const addCamera = useCallback((data: { name: string; url: string; location: string; ownerId: string; owner: string }) => {
    const newCam: SimCamera = {
      id: `cam-${Date.now()}`,
      name: data.name,
      owner: data.owner,
      ownerId: data.ownerId,
      status: "online",
      lastActive: new Date(),
      location: data.location,
      recording: false,
      detection: null,
      fps: 30,
    };
    setCameras(prev => [...prev, newCam]);
  }, []);

  const updateUser = useCallback((id: string, data: Partial<SimUser>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  const addUser = useCallback((data: Omit<SimUser, "id">) => {
    setUsers(prev => [...prev, { ...data, id: String(Date.now()) }]);
  }, []);

  const unreadCount = alerts.filter(a => !a.read).length;
  const criticalCount = alerts.filter(a => a.severity === "critical" && !a.acknowledged).length;
  const activeCameraCount = cameras.filter(c => c.status === "online").length;

  return (
    <SimulationContext.Provider value={{
      alerts, cameras, aiEngine, riskScore, unreadCount, criticalCount, activeCameraCount, users,
      markAlertRead, markAllRead, acknowledgeAlert, deleteAlert, toggleAIEngine, toggleCamera,
      deleteCamera, updateCamera, addCamera, updateUser, deleteUser, addUser,
    }}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error("useSimulation must be used within SimulationProvider");
  return ctx;
};
