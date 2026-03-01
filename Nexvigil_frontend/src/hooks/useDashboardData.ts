import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export interface DashboardSummary {
    active_cameras: number;
    offline_cameras: number;
    total_cameras: number;
    total_alerts: number;
    alerts_today: number;
    critical_alerts: number;
    high_alerts: number;
    medium_alerts: number;
    low_alerts: number;
    unread_notifications: number;
    storage_used_mb: number;
    ai_status: string;
    server_time: string;
    most_detected: Array<{ object: string; count: number }>;
}

export interface RiskScoreResponse {
    risk_score: number;
    level: string;
}

export interface MetricsTrend {
    day: string;
    alerts: number;
    critical: number;
}

const EMPTY_SUMMARY: DashboardSummary = {
    active_cameras: 0,
    offline_cameras: 0,
    total_cameras: 0,
    total_alerts: 0,
    alerts_today: 0,
    critical_alerts: 0,
    high_alerts: 0,
    medium_alerts: 0,
    low_alerts: 0,
    unread_notifications: 0,
    storage_used_mb: 0,
    ai_status: "unknown",
    server_time: new Date().toISOString(),
    most_detected: []
};

export const useDashboardData = (isAdmin: boolean) => {
    // 1. Dashboard Summary — all from DB, no mock data
    const summaryQuery = useQuery<DashboardSummary>({
        queryKey: ["dashboard-summary"],
        queryFn: async () => {
            const { data, error } = await api.system.summary();
            if (error) return EMPTY_SUMMARY;
            // server returns { success, data: { ... } }
            const raw = (data as any);
            const summary = raw?.data ?? raw;
            if (!summary) return EMPTY_SUMMARY;
            return {
                active_cameras: summary.active_cameras ?? 0,
                offline_cameras: summary.offline_cameras ?? 0,
                total_cameras: summary.total_cameras ?? 0,
                total_alerts: summary.total_alerts ?? 0,
                alerts_today: summary.alerts_today ?? 0,
                critical_alerts: summary.critical_alerts ?? 0,
                high_alerts: summary.high_alerts ?? 0,
                medium_alerts: summary.medium_alerts ?? 0,
                low_alerts: summary.low_alerts ?? 0,
                unread_notifications: summary.unread_notifications ?? 0,
                storage_used_mb: summary.storage_used_mb ?? 0,
                ai_status: summary.ai_status ?? "unknown",
                server_time: summary.server_time ?? new Date().toISOString(),
                most_detected: summary.most_detected ?? []
            } as DashboardSummary;
        },
        refetchInterval: 12000,
        refetchIntervalInBackground: false,
    });

    // 2. Risk Score
    const riskQuery = useQuery<RiskScoreResponse>({
        queryKey: ["risk-score"],
        queryFn: async () => {
            const { data } = await api.analytics.riskScore();
            const raw = (data as any)?.data || data;
            return raw || { risk_score: 0, level: "low" };
        },
        refetchInterval: 15000,
    });

    // 3. Weekly Trends (From Alert Analytics)
    const trendsQuery = useQuery<MetricsTrend[]>({
        queryKey: ["weekly-trends"],
        queryFn: async () => {
            const res = await api.analytics.detectionOverview();
            const raw = (res.data as any)?.data || res.data;
            if (!raw || !raw.alerts_by_day) return [];
            const last7 = raw.alerts_by_day.slice(-7);
            return last7.map((d: any) => ({
                day: d.date.slice(5),
                alerts: d.count,
                critical: d.critical
            }));
        },
    });

    // 4. Recent Alerts — from DB, sorted by created_at desc
    const alertsQuery = useQuery<any[]>({
        queryKey: ["recent-alerts"],
        queryFn: async () => {
            const { data } = await api.alerts.list({ limit: 6 });
            const res = data as any;
            let alerts: any[] = [];
            if (res && Array.isArray(res.data)) alerts = res.data;
            else if (Array.isArray(res)) alerts = res;
            return alerts.map((a: any) => ({
                ...a,
                id: a.id || a._id || "",
            }));
        },
        refetchInterval: 12000,
        refetchIntervalInBackground: false,
    });

    // 5. AI Metrics
    const aiQuery = useQuery<any>({
        queryKey: ["ai-metrics-status"],
        queryFn: async () => {
            const { data } = await api.system.aiMetrics();
            const raw = (data as any)?.data || data;
            // Handle if raw is an array of detailed metrics OR an overview object
            if (Array.isArray(raw) && raw.length > 0) return raw[0];
            return raw || { model_status: "stopped" };
        },
        enabled: isAdmin,
        refetchInterval: 15000,
    });

    return {
        summary: summaryQuery.data ?? EMPTY_SUMMARY,
        riskScore: riskQuery.data?.risk_score ?? 0,
        trends: trendsQuery.data ?? [],
        recentAlerts: alertsQuery.data ?? [],
        aiStatus: aiQuery.data ?? { status: "unknown" },
        isLoading: summaryQuery.isLoading || riskQuery.isLoading,
    };
};
