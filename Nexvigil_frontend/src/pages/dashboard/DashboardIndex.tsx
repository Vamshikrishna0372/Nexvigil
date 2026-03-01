import { useAuth } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";

const AdminDashboard = lazy(() => import("./Dashboard"));
const UserDashboard = lazy(() => import("./UserDashboard"));

const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[50vh]">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const DashboardIndex = () => {
  const { isAdmin } = useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
      {isAdmin ? <AdminDashboard /> : <UserDashboard />}
    </Suspense>
  );
};

export default DashboardIndex;
