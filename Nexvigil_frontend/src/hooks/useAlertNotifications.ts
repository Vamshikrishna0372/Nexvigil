import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Professional Alert Notification Service
 * Polls for new alerts and displays them as clean, enterprise-level toasts.
 * Features: Debouncing, Severity Styling, Professional Messaging.
 */
export const useAlertNotifications = (pollingInterval = 5000) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const lastAlertIdRef = useRef<string | null>(null);
    const lastToastTimeRef = useRef<Record<string, number>>({});

    useEffect(() => {
        if (!user) return;

        const pollAlerts = async () => {
            try {
                // Fetch only the latest 1 alert
                const { data } = await api.alerts.list({ limit: 1, acknowledged: false });
                const list = (data as any)?.data || data;

                if (!Array.isArray(list) || list.length === 0) return;
                const latest = list[0];
                
                // 1. Requirement: Suppress "Low" severity (Periodic Captures) from Toasts
                // These are logged but shouldn't clutter the professional UI with popups.
                if (latest.severity === "low") {
                    lastAlertIdRef.current = latest.id || latest._id;
                    return;
                }

                // 2. Map Professional Values
                const severity = (latest.severity || "info").toLowerCase();
                const variant = severity === "critical" ? "critical" : severity === "high" ? "warning" : "info";
                const title = latest.display_message || latest.rule_name || `${String(latest.object_detected).toUpperCase()} SECURITY EVENT`;
                const description = `Source: CAM-${latest.camera_id?.slice(-4) || "0000"} | Confidence: ${Math.round((latest.confidence || 0) * 100)}%`;

                const alertId = latest.id || latest._id;

                // 3. Skip if already processed the same unique event ID
                if (alertId === lastAlertIdRef.current) return;
                
                // 4. Ultra-Strict Debounce Logic: Prevent duplicate class-messages from the same camera for 60 seconds
                const now = Date.now();
                const msgKey = `${latest.object_detected}_${latest.camera_id}`;
                
                if (lastToastTimeRef.current[msgKey] && (now - lastToastTimeRef.current[msgKey] < 60000)) {
                    // It's a duplicate spam within the 60s cooldown.
                    // IMPORTANT: We silently update the alertId so we don't get stuck infinitely trying to toast it
                    lastAlertIdRef.current = alertId;
                    return; 
                }

                // If it passes all gates, update refs and trigger the UI
                lastAlertIdRef.current = alertId;
                lastToastTimeRef.current[msgKey] = now;

                // 5. Trigger Professional Toast
                toast({
                    title: `🚨 ${title}`,
                    description,
                    variant: variant as any,
                    duration: 8000, 
                });

            } catch (err) {
                console.error("Notification polling error:", err);
            }
        };

        const interval = setInterval(pollAlerts, pollingInterval);
        return () => clearInterval(interval);
    }, [user, toast, pollingInterval]);
};
