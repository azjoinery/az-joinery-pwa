"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/store/auth";
import type { User } from "@/lib/types";

interface RoleDef {
  key: string;
  label: string;
  level: number;
  description?: string;
  immutable?: boolean;
  assignable?: boolean;
}

interface RoleCatalog {
  roles: RoleDef[];
  permissions: string[];
  pickerOptions?: string[];
}

interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  targetId: string;
  targetName: string;
  action: string;
  prev: unknown;
  next: unknown;
  createdAt: string;
}

const DEPARTMENTS = ["sales", "admin", "production", "job_progress", "daily_output",
  "staff_performance", "inventory", "qhs", "delivery", "installation", "reports", "approvals"];
const MATRIX_ACTIONS = ["view", "create", "edit", "delete", "approve", "export", "manage"];

const AUDIT_ACTION_LABELS: Record<string, string> = {
  role_change: "Role changed",
  active_change: "Active status changed",
  delete_user: "User deleted",
  permission_change: "Permission flags changed",
  matrix_change: "Permission matrix changed",
};

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function TeamPage() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState<"users" | "audit">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<RoleCatalog | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditLoaded, setAuditLoaded] = useState(false);

  const isMD = me?.role === "managing_director";

  useEffect(() => {
    loadUsers();
    loadCatalog();
  }, []);

  useEffect(() => {
    if (tab === "audit" && !auditLoaded) loadAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await api.get<User[]>("/users");
      setUsers(data || []);
    } catch (err) {
      setUsersError("Couldn't load the team list. Check your connection and try again.");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadCatalog = async () => {
    try {
      const data = await api.get<RoleCatalog>("/roles/catalog");
      setCatalog(data);
    } catch (err) {
      // Non-fatal — role dropdowns will fall back to a plain list.
    }
  };

  const loadAudit = async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const data = await api.get<AuditEntry[]>("/roles/audit?limit=100");
      setAudit(data || []);
      setAuditLoaded(true);
    } catch (err) {
      setAuditError("Couldn't load the audit log — you may not have permission to view it, or the connection failed.");
    } finally {
      setAuditLoading(false);
    }
  };

  const assignableRoles = (catalog?.roles || []).filter((r) => r.assignable && (isMD || r.key !== "managing_director"));

  const createUser = async () => {
    if (!newName.trim() || !newEmail.trim() || newPassword.length < 6 || !newRole) return;
    setCreateSaving(true);
    setCreateError(null);
    try {
      await api.post("/auth/register", { name: newName, email: newEmail, password: newPassword, role: newRole });
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("");
      setShowCreate(false);
      loadUsers();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setCreateError(typeof detail === "string" ? detail : "Couldn't create this account — it was not saved. Check the details and try again.");
    } finally {
      setCreateSaving(false);
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId) || null;

  return (
    <div className="p-4 pb-28 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">👥 Team &amp; Roles</h1>
      <p className="text-sm text-gray-600">Manage staff accounts, roles, and permissions.</p>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab("users")}
          className={`px-4 py-2 font-medium ${tab === "users" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-600"}`}
        >
          Users ({users.length})
        </button>
        <button
          onClick={() => setTab("audit")}
          className={`px-4 py-2 font-medium ${tab === "audit" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-600"}`}
        >
          Audit Log
        </button>
      </div>

      {tab === "users" && (
        <>
          {selectedUser ? (
            <UserDetail
              targetUser={selectedUser}
              me={me}
              catalog={catalog}
              onBack={() => setSelectedUserId(null)}
              onUpdated={(u) => {
                setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));
              }}
              onDeleted={(id) => {
                setUsers((prev) => prev.filter((x) => x.id !== id));
                setSelectedUserId(null);
              }}
            />
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600"
              >
                + New Team Member
              </button>

              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{createError}</div>
              )}

              {showCreate && (
                <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
                  <input
                    type="text"
                    placeholder="Full name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="password"
                    placeholder="Temporary password (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select a role...</option>
                    {assignableRoles.length > 0
                      ? assignableRoles.map((r) => (
                          <option key={r.key} value={r.key}>{r.label}</option>
                        ))
                      : ["admin", "supervisor", "office", "drafter", "cabinet_maker", "installer", "contractor"].map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                  </select>
                  <button
                    onClick={createUser}
                    disabled={createSaving || !newName.trim() || !newEmail.trim() || newPassword.length < 6 || !newRole}
                    className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {createSaving ? "Creating..." : "Create Account"}
                  </button>
                </div>
              )}

              {usersError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{usersError}</div>
              )}

              {usersLoading ? (
                <div className="text-center py-8 text-gray-600">Loading team...</div>
              ) : (
                <div className="space-y-2">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className="w-full text-left bg-white p-4 rounded-lg border border-gray-200 hover:border-orange-300 flex justify-between items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{u.name}</span>
                          {u.id === me?.id && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">You</span>}
                          {!u.active && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Inactive</span>}
                        </div>
                        <p className="text-sm text-gray-500">{u.email}</p>
                      </div>
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">
                        {u.role.replace("_", " ")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === "audit" && (
        <div className="space-y-2">
          {auditError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{auditError}</div>
          )}
          {auditLoading ? (
            <div className="text-center py-8 text-gray-600">Loading audit log...</div>
          ) : audit.length === 0 && !auditError ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-gray-600">
              No role or permission changes recorded yet
            </div>
          ) : (
            audit.map((a) => (
              <div key={a.id} className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-900">
                    {AUDIT_ACTION_LABELS[a.action] || a.action} — {a.targetName}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">{fmtVal(a.prev)} → {fmtVal(a.next)}</p>
                <p className="text-xs text-gray-400 mt-1">by {a.actorName} ({a.actorRole})</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function UserDetail({
  targetUser,
  me,
  catalog,
  onBack,
  onUpdated,
  onDeleted,
}: {
  targetUser: User;
  me: User | null;
  catalog: RoleCatalog | null;
  onBack: () => void;
  onUpdated: (u: User) => void;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState(targetUser.name);
  const [role, setRole] = useState(targetUser.role);
  const [active, setActive] = useState(targetUser.active);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isMD = me?.role === "managing_director";
  const isManager = me?.role === "manager";
  const canEditMatrix = isMD || (isManager && targetUser.role === "admin");

  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>(targetUser.permissionMatrix || {});
  const [matrixSaving, setMatrixSaving] = useState(false);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);

  const isSelf = targetUser.id === me?.id;

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const body: Record<string, unknown> = { name, active };
      if (role !== targetUser.role) body.role = role;
      if (newPassword.trim().length >= 6) body.password = newPassword;
      const updated = await api.patch<User>(`/users/${targetUser.id}`, body);
      onUpdated(updated);
      setNewPassword("");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setSaveError(typeof detail === "string" ? detail : "Couldn't save these changes — they were not recorded.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/users/${targetUser.id}`);
      onDeleted(targetUser.id);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setDeleteError(typeof detail === "string" ? detail : "Couldn't delete this account.");
    } finally {
      setDeleting(false);
    }
  };

  const toggleMatrixCell = (dept: string, action: string) => {
    setMatrix((prev) => ({
      ...prev,
      [dept]: { ...prev[dept], [action]: !prev[dept]?.[action] },
    }));
  };

  const saveMatrix = async () => {
    setMatrixSaving(true);
    setMatrixError(null);
    try {
      const updated = await api.patch<User>(`/users/${targetUser.id}/matrix`, { permissionMatrix: matrix });
      onUpdated(updated);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setMatrixError(typeof detail === "string" ? detail : "Couldn't save the permission matrix.");
    } finally {
      setMatrixSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-orange-600 font-medium">← Back to team</button>

      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
        <div>
          <label className="text-xs text-gray-500">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Email (cannot be changed here)</label>
          <input type="text" value={targetUser.email} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as User["role"])}
            disabled={isSelf}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
          >
            {(catalog?.roles || []).filter((r) => r.assignable || r.key === targetUser.role).map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
            {!catalog && <option value={targetUser.role}>{targetUser.role}</option>}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-900">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={isSelf} />
          Active
        </label>
        <div>
          <label className="text-xs text-gray-500">Reset password (optional, min 6 characters)</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {saveError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{saveError}</div>
        )}
        <button
          onClick={save}
          disabled={saving || !name.trim()}
          className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {canEditMatrix && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <button
            onClick={() => setShowMatrix(!showMatrix)}
            className="text-sm font-semibold text-gray-900"
          >
            {showMatrix ? "▾" : "▸"} Permission Matrix
          </button>
          {showMatrix && (
            <>
              <p className="text-xs text-gray-500">
                Explicit overrides for this user. Unchecked cells fall back to their role&apos;s default access.
              </p>
              {matrixError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{matrixError}</div>
              )}
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-1 pr-2">Department</th>
                      {MATRIX_ACTIONS.map((a) => (
                        <th key={a} className="px-1 py-1 text-center capitalize">{a}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DEPARTMENTS.map((dept) => (
                      <tr key={dept} className="border-t border-gray-100">
                        <td className="py-1 pr-2 whitespace-nowrap capitalize">{dept.replace("_", " ")}</td>
                        {MATRIX_ACTIONS.map((action) => (
                          <td key={action} className="px-1 py-1 text-center">
                            <input
                              type="checkbox"
                              checked={!!matrix[dept]?.[action]}
                              onChange={() => toggleMatrixCell(dept, action)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={saveMatrix}
                disabled={matrixSaving}
                className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {matrixSaving ? "Saving..." : "Save Permission Matrix"}
              </button>
            </>
          )}
        </div>
      )}

      {!isSelf && (
        <div className="bg-white p-4 rounded-lg border border-red-200 space-y-2">
          <p className="text-sm font-semibold text-red-700">Danger zone</p>
          {deleteError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{deleteError}</div>
          )}
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="text-sm text-red-600 hover:text-red-800">
              Delete this account permanently
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-700">This permanently removes {targetUser.name}&apos;s account. This cannot be undone. Are you sure?</p>
              <div className="flex gap-2">
                <button
                  onClick={remove}
                  disabled={deleting}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400"
                >
                  {deleting ? "Deleting..." : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
