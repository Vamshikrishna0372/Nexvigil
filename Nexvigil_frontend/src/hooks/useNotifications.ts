import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

export const useNotifications = () => {
    const queryClient = useQueryClient();

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ["notifications"],
        queryFn: async () => {
            const { data } = await api.notifications.list();
            // Assuming data is array. If paginated, take data.data
            const list = (data as any)?.data || data || [];
            if (Array.isArray(list)) return list;
            return [];
        },
        refetchInterval: 10000
    });

    const { data: unreadCount = 0 } = useQuery({
        queryKey: ["notifications-unread"],
        queryFn: async () => {
            // If list endpoint returns list, we can count manually or use unread-count endpoint
            // api.notifications.unreadCount()
            const { data } = await api.notifications.unreadCount();
            return (data as any)?.count || 0;
        },
        refetchInterval: 10000
    });

    const markReadMutation = useMutation({
        mutationFn: async (id: string) => api.notifications.markRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
        }
    });

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            // Loop or bulk endpoint? Assuming we mark all local as read or endpoint supports it
            // Backend phase 13 didn't show bulk mark read endpoint.
            // I'll leave this empty or loop
        }
    });

    return {
        notifications,
        unreadCount,
        markRead: markReadMutation.mutate,
        isLoading
    };
};
