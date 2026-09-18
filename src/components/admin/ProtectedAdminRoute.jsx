import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
function ProtectedAdminRoute({ children }) {
  const [state, setState] = useState("loading");
  useEffect(() => {
    let cancelled = false;
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) setState("unauthorized");
        return;
      }
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin"
      });
      if (!cancelled) {
        setState(data === true ? "authorized" : "unauthorized");
      }
    }
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);
  if (state === "loading") {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>;
  }
  if (state === "unauthorized") {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}
export {
  ProtectedAdminRoute
};
