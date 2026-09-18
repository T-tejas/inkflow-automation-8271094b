import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
function useAuth() {
  const [state, setState] = useState({
    user: null,
    session: null,
    role: null,
    loading: true
  });
  const fetchRole = useCallback(async (userId) => {
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (isAdmin) return "admin";
    const { data: isStaff } = await supabase.rpc("has_role", { _user_id: userId, _role: "staff" });
    if (isStaff) return "staff";
    return "user";
  }, []);
  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setState({ user: null, session: null, role: null, loading: false });
      return;
    }
    const role = await fetchRole(session.user.id);
    setState({ user: session.user, session, role, loading: false });
  }, [fetchRole]);
  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setState({ user: null, session: null, role: null, loading: false });
      } else {
        fetchRole(session.user.id).then((role) => {
          setState({ user: session.user, session, role, loading: false });
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [refresh, fetchRole]);
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);
  return { ...state, signOut, isAdmin: state.role === "admin", isStaff: state.role === "staff" };
}
export {
  useAuth
};
