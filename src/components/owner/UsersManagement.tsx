import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { UserCheck, Shield, Loader2 } from 'lucide-react';

type AppRole = 'owner' | 'manager' | 'waiter' | 'kitchen';

interface UserWithRole {
  id: string;
  name: string;
  role: AppRole | null;
}

const ROLE_LABELS: Record<AppRole, string> = {
  owner: 'Dueño',
  manager: 'Encargado',
  waiter: 'Mozo',
  kitchen: 'Cocina',
};

const ASSIGNABLE_ROLES: AppRole[] = ['owner', 'manager', 'waiter', 'kitchen'];

const UsersManagement = () => {
  const { currentUser } = useApp();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!currentUser?.restaurantId) return;

    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('restaurant_id', currentUser.restaurantId);

    if (pErr) {
      console.error('Error fetching profiles:', pErr);
      toast.error('Error al cargar usuarios');
      setLoading(false);
      return;
    }

    const { data: roles, error: rErr } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rErr) {
      console.error('Error fetching roles:', rErr);
    }

    const roleMap = new Map<string, AppRole>();
    (roles || []).forEach((r: any) => roleMap.set(r.user_id, r.role as AppRole));

    const merged: UserWithRole[] = (profiles || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      role: roleMap.get(p.id) || null,
    }));

    // Sort: pending first, then by name
    merged.sort((a, b) => {
      if (!a.role && b.role) return -1;
      if (a.role && !b.role) return 1;
      return a.name.localeCompare(b.name);
    });

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser?.restaurantId]);

  const handleRoleChange = async (userId: string, newRole: AppRole | '') => {
    if (userId === currentUser?.id) {
      toast.error('No podés cambiar tu propio rol');
      return;
    }

    setSaving(userId);

    try {
      if (newRole === '') {
        // Remove role
        await supabase.from('user_roles').delete().eq('user_id', userId);
      } else {
        // Upsert: delete existing then insert new
        await supabase.from('user_roles').delete().eq('user_id', userId);
        const { error } = await supabase.from('user_roles').insert({
          user_id: userId,
          role: newRole,
        });
        if (error) throw error;
      }

      toast.success('Rol actualizado');
      await fetchUsers();
    } catch (err: any) {
      console.error('Error updating role:', err);
      toast.error('Error al actualizar rol: ' + (err.message || 'desconocido'));
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingUsers = users.filter(u => !u.role);
  const activeUsers = users.filter(u => !!u.role);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="font-display font-semibold text-xl text-foreground">Gestión de usuarios</h2>
      </div>

      {pendingUsers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-warning flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Pendientes de activación ({pendingUsers.length})
          </h3>
          <div className="space-y-2">
            {pendingUsers.map(user => (
              <UserRow
                key={user.id}
                user={user}
                isSelf={user.id === currentUser?.id}
                saving={saving === user.id}
                onRoleChange={handleRoleChange}
                isPending
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Usuarios activos ({activeUsers.length})
        </h3>
        <div className="space-y-2">
          {activeUsers.map(user => (
            <UserRow
              key={user.id}
              user={user}
              isSelf={user.id === currentUser?.id}
              saving={saving === user.id}
              onRoleChange={handleRoleChange}
            />
          ))}
        </div>
      </div>

      {users.length === 0 && (
        <p className="text-muted-foreground text-center py-8">No hay usuarios registrados</p>
      )}
    </div>
  );
};

const UserRow = ({
  user,
  isSelf,
  saving,
  onRoleChange,
  isPending,
}: {
  user: UserWithRole;
  isSelf: boolean;
  saving: boolean;
  onRoleChange: (userId: string, role: AppRole | '') => void;
  isPending?: boolean;
}) => (
  <div
    className={`flex items-center justify-between p-3 rounded-lg border ${
      isPending
        ? 'border-warning/40 bg-warning/5'
        : 'border-border bg-card'
    }`}
  >
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground truncate">
        {user.name}
        {isSelf && <span className="text-xs text-muted-foreground ml-2">(vos)</span>}
      </p>
      {isPending && (
        <p className="text-xs text-warning">Sin rol asignado</p>
      )}
    </div>
    <div className="flex items-center gap-2">
      {saving ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : (
        <select
          value={user.role || ''}
          onChange={e => onRoleChange(user.id, e.target.value as AppRole | '')}
          disabled={isSelf}
          className="text-sm rounded-md border border-border bg-background px-2 py-1.5 text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Sin rol</option>
          {ASSIGNABLE_ROLES.map(role => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      )}
    </div>
  </div>
);

export default UsersManagement;
