import { useAuth } from "@/contexts/AuthContext";

type UserRole = 'owner' | 'member';

export function useUserRole() {
  const { userRole } = useAuth();

  const isOwner = () => userRole === 'owner';
  const isMember = () => userRole === 'member';
  const hasRole = (role: UserRole) => userRole === role;

  return {
    userRole,
    isOwner,
    isMember,
    hasRole,
  };
}
