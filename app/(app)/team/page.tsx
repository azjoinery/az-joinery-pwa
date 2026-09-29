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
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newRole, setNewRole] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdTempPin, setCreatedTempPin] = useState<{ name: string; phone: string; email: string; pin: string } | null>(null);

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
    if (!newName.trim() || !newEmail.trim() || !newRole) return;
    setCreateSaving(true);
    setCreateError(null);
    try {
      const created = await api.post<any>("/auth/register", {
        name: newName, email: newEmail, role: newRole,
        phone: newPhone || undefined, address: newAddress || undefined,
      });
      // Generate a temp PIN for the new user
      const pinRes = await api.post<any>(`/auth/reset-pin/${created.id}`, {});
      setCreatedTempPin({ name: newName, phone: newPhone, email: newEmail, pin: pinRes.tempPin });
      setNewName(""); setNewEmail(""); setNewPhone(""); setNewAddress(""); setNewRole("");
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
    <div className="page space-y-4">
      <h1 className="page-title">Team &amp; Roles</h1>
      <p className="page-subtitle">Manage staff accounts, roles, and permissions.</p>

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
                className="btn-primary w-full"
              >
                + New Team Member
              </button>

              {createError && (
                <div className="alert-danger">{createError}</div>
              )}

              {showCreate && (
                <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Full name" value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    <input type="tel" placeholder="Phone number" value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <input type="email" placeholder="Email address" value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  <input type="text" placeholder="Home address" value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">Select a role...</option>
                    {assignableRoles.length > 0
                      ? assignableRoles.map((r) => (<option key={r.key} value={r.key}>{r.label}</option>))
                      : ["admin","supervisor","office","drafter","cabinet_maker","installer","contractor"].map((r) => (
                          <option key={r} value={r}>{r}</option>))}
                  </select>
                  <p className="text-xs text-gray-500">A temporary PIN will be generated automatically — no password needed.</p>
                  <button onClick={createUser}
                    disabled={createSaving || !newName.trim() || !newEmail.trim() || !newRole}
                    className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed">
                    {createSaving ? "Creating..." : "Create Account"}
                  </button>
                </div>
              )}

              {createdTempPin && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-semibold text-amber-800">Account created — send {createdTempPin.name} their temporary PIN</p>
                  <p className="text-3xl font-bold tracking-widest text-ink-900">{createdTempPin.pin}</p>
                  <div className="flex gap-2 flex-wrap">
                    {createdTempPin.phone && (
                      <a href={`https://wa.me/61${createdTempPin.phone.replace(/^0/, "").replace(/\s/g, "")}?text=${encodeURIComponent(`Hi ${createdTempPin.name}, welcome to AZ Joinery. Your temporary app PIN is ${createdTempPin.pin}. Open the app at app.azjoinery.com.au and you will be asked to set your own PIN on first login.`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600">
                        WhatsApp
                      </a>
                    )}
                    <a href={`mailto:${createdTempPin.email}?subject=${encodeURIComponent("Your AZ Joinery App PIN")}&body=${encodeURIComponent(`Hi ${createdTempPin.name},\n\nWelcome to AZ Joinery.\n\nYour temporary app PIN is: ${createdTempPin.pin}\n\nOpen the app at app.azjoinery.com.au and you will be asked to set your own PIN on first login.\n\nAZ Joinery`)}`}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg hover:bg-blue-100">
                      Email
                    </a>
                  </div>
                  <button onClick={() => setCreatedTempPin(null)} className="text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
                </div>
              )}

              {usersError && (
                <div className="alert-danger">{usersError}</div>
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
            <div className="alert-danger">{auditError}</div>
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
  const [phone, setPhone] = useState(targetUser.phone || "");
  const [address, setAddress] = useState(targetUser.address || "");
  const [photoUrl, setPhotoUrl] = useState(targetUser.photoUrl || "");
  const [licenceUrl, setLicenceUrl] = useState(targetUser.licenceUrl || "");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pinResetting, setPinResetting] = useState(false);
  const [resetTempPin, setResetTempPin] = useState<string | null>(null);

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
      const body: Record<string, unknown> = { name, active, phone, address };
      if (role !== targetUser.role) body.role = role;
      if (newPassword.trim().length >= 6) body.password = newPassword;
      if (photoUrl !== targetUser.photoUrl) body.photoUrl = photoUrl;
      if (licenceUrl !== targetUser.licenceUrl) body.licenceUrl = licenceUrl;
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

  const handleResetPin = async () => {
    setPinResetting(true);
    try {
      const res = await api.post<any>(`/auth/reset-pin/${targetUser.id}`, {});
      setResetTempPin(res.tempPin);
    } catch {
      // silent — show nothing if it fails
    } finally {
      setPinResetting(false);
    }
  };

  const handleFileUpload = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target?.result as string);
    reader.readAsDataURL(file);
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="04XX XXX XXX" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500">Email (cannot be changed here)</label>
          <input type="text" value={targetUser.email} disabled
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Home address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, suburb, state, postcode"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as User["role"])}
            disabled={isSelf} className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50">
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
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>

        <div className="border-t border-gray-100 pt-3 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Identity documents</p>

          <div>
            <label className="text-xs text-gray-500">Driver licence / Photo ID</label>
            {licenceUrl ? (
              <div className="flex items-center gap-2 mt-1">
                <img src={licenceUrl} alt="Licence" className="h-16 rounded-lg border border-gray-200 object-cover" />
                <button type="button" onClick={() => setLicenceUrl("")}
                  className="text-xs text-red-500 hover:text-red-700">Remove</button>
              </div>
            ) : (
              <label className="mt-1 flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50">
                <span className="text-sm text-gray-500">Tap to upload image</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload(setLicenceUrl)} />
              </label>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-500">Profile photo</label>
            {photoUrl ? (
              <div className="flex items-center gap-2 mt-1">
                <img src={photoUrl} alt="Profile" className="h-16 w-16 rounded-full border border-gray-200 object-cover" />
                <button type="button" onClick={() => setPhotoUrl("")}
                  className="text-xs text-red-500 hover:text-red-700">Remove</button>
              </div>
            ) : (
              <label className="mt-1 flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50">
                <span className="text-sm text-gray-500">Tap to upload photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload(setPhotoUrl)} />
              </label>
            )}
          </div>
        </div>

        {saveError && <div className="alert-danger">{saveError}</div>}
        <button onClick={save} disabled={saving || !name.trim()}
          className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {!isSelf && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">App PIN</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {targetUser.pinSet
                  ? `${targetUser.name} has set their own PIN.`
                  : `${targetUser.name} has not set a PIN yet.`}
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${targetUser.pinSet ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {targetUser.pinSet ? "Set" : "Not set"}
            </span>
          </div>
          <button onClick={handleResetPin} disabled={pinResetting}
            className="w-full py-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg hover:bg-amber-100 disabled:opacity-50">
            {pinResetting ? "Generating..." : "Reset PIN — generate new temporary PIN"}
          </button>
          {resetTempPin && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-800">New temporary PIN — send to {targetUser.name}</p>
              <p className="text-3xl font-bold tracking-widest text-ink-900">{resetTempPin}</p>
              <div className="flex gap-2 flex-wrap">
                {targetUser.phone && (
                  <a href={`https://wa.me/61${(targetUser.phone).replace(/^0/, "").replace(/\s/g, "")}?text=${encodeURIComponent(`Hi ${targetUser.name}, your AZ Joinery app PIN has been reset. Your new temporary PIN is ${resetTempPin}. Open the app to set your own PIN.`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600">
                    WhatsApp
                  </a>
                )}
                <a href={`mailto:${targetUser.email}?subject=${encodeURIComponent("Your AZ Joinery PIN has been reset")}&body=${encodeURIComponent(`Hi ${targetUser.name},\n\nYour app PIN has been reset.\n\nYour new temporary PIN is: ${resetTempPin}\n\nOpen the app at app.azjoinery.com.au to set your own PIN.\n\nAZ Joinery`)}`}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-lg hover:bg-blue-100">
                  Email
                </a>
                <button onClick={() => setResetTempPin(null)} className="text-xs text-gray-400 hover:text-gray-600 ml-auto">Dismiss</button>
              </div>
            </div>
          )}
        </div>
      )}

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
                <div className="alert-danger">{matrixError}</div>
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
            <div className="alert-danger">{deleteError}</div>
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
