import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Loader2,
  ShieldAlert,
  UserPlus,
  KeyRound,
  Trash2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { PersonAvatar } from "@/components/person-avatar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useTeamQuery,
  useUpdateUserRoleMutation,
  useCreateUserMutation,
  useResetPasswordMutation,
  useDeleteUserMutation,
  useMeQuery,
} from "@/lib/api-hooks";
import { useHub } from "@/lib/store";
import type { RoleType } from "@/server/db/types";
import type { Person } from "@/lib/types";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });

const roles: RoleType[] = ["super_admin", "faculty", "lead", "member"];

export function UsersPage() {
  const { data: meData } = useMeQuery();
  const { data: team = [], isLoading, isError, error, refetch } = useTeamQuery();
  const updateRole = useUpdateUserRoleMutation();
  const createUser = useCreateUserMutation();
  const resetPassword = useResetPasswordMutation();
  const deleteUser = useDeleteUserMutation();
  const setProfileDialog = useHub((s) => s.setProfileDialog);

  const isSuperAdmin = meData?.profile?.role === "super_admin";

  // Create user dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createName, setCreateName] = useState("");
  const [createRole, setCreateRole] = useState<RoleType>("member");
  const [createTitle, setCreateTitle] = useState("Engineering Intern");
  const [createDept, setCreateDept] = useState("CSE");
  const [createYear, setCreateYear] = useState("");
  const [createRegNo, setCreateRegNo] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createCollege, setCreateCollege] = useState("RV Institute of Technology");

  // Reset password dialog state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const handleRoleChange = async (userId: string, newRole: RoleType, userName: string) => {
    try {
      await updateRole.mutateAsync({ userId, role: newRole });
      toast.success(`Role updated for ${userName}`, {
        description: `Promoted/Assigned to ${newRole.replace("_", " ")}`,
      });
    } catch (err: unknown) {
      toast.error("Role update failed", {
        description: (err as Error)?.message || "Only Super Admins can alter role assignments.",
      });
    }
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!createEmail.trim() || !createPassword.trim() || !createName.trim()) {
      toast.error("Email, password, and name are required.");
      return;
    }

    if (createPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    try {
      await createUser.mutateAsync({
        email: createEmail.trim().toLowerCase(),
        password: createPassword,
        name: createName.trim(),
        role: createRole,
        title: createTitle.trim() || (createRole === "super_admin" ? "Admin Lead" : createRole === "faculty" ? "Faculty Guide" : createRole === "lead" ? "Team Lead" : "Engineering Intern"),
        dept: createDept.trim() || "CSE",
        year: createYear.trim() || null,
        registration_no: createRegNo.trim() || null,
        phone: createPhone.trim() || null,
        college: createCollege.trim() || null,
      });

      toast.success(`User ${createName} created successfully!`, {
        description: `${createEmail} assigned as ${createRole === "member" ? "Intern" : createRole.replace("_", " ")}`,
      });

      setCreateDialogOpen(false);
      setCreateEmail("");
      setCreatePassword("");
      setCreateName("");
      setCreateRole("member");
      setCreateTitle("Engineering Intern");
      setCreateYear("");
      setCreateRegNo("");
      setCreatePhone("");
    } catch (err: unknown) {
      toast.error("Failed to create user", {
        description: (err as Error)?.message || "Server error",
      });
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !newPassword.trim()) return;

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    try {
      await resetPassword.mutateAsync({
        userId: resetTargetUser.id,
        newPassword: newPassword.trim(),
      });

      toast.success(`Password reset for ${resetTargetUser.name}`, {
        description: "User can now log in with the new password.",
      });

      setResetDialogOpen(false);
      setResetTargetUser(null);
      setNewPassword("");
    } catch (err: unknown) {
      toast.error("Password reset failed", {
        description: (err as Error)?.message || "Server error",
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to permanently delete user "${userName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteUser.mutateAsync({ userId });
      toast.success(`User ${userName} deleted.`);
    } catch (err: unknown) {
      toast.error("Failed to delete user", {
        description: (err as Error)?.message || "Server error",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            Users & Roles
            {isSuperAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-mono font-medium text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3.5 w-3.5" /> Super Admin Authorized
              </span>
            )}
          </h1>
          <p className="text-sm text-muted">Authoritative RBAC directory for the engineering cohort.</p>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin ? (
            <Button
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Create User
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-warn-soft px-3 py-1.5 text-xs font-semibold text-warn">
              <ShieldAlert className="h-4 w-4" /> View-only mode: Super Admin privilege required to alter roles
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted">Loading user directory...</p>
        </div>
      ) : isError ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center gap-3 rounded-xl border border-danger/30 bg-danger-soft p-6 text-center">
          <p className="text-sm font-semibold text-danger">Failed to load users: {(error as Error)?.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <Card className="overflow-x-auto p-0 border border-border bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted border-b border-border">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Person</th>
                <th className="px-3 py-2.5 text-left font-medium">Dept & Title</th>
                <th className="px-3 py-2.5 text-left font-medium">Current Role</th>
                <th className="px-3 py-2.5 text-left font-medium">Presence</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {team.map((p) => {
                const personObj: Person = {
                  id: p.user_id,
                  name: p.name,
                  short: p.short || p.name.slice(0, 2).toUpperCase(),
                  role: p.role,
                  title: p.title,
                  dept: p.dept,
                  email: p.email,
                  presence: p.presence,
                  avatar_url: p.avatar_url,
                  phone: p.phone,
                  bio: p.bio,
                  college: p.college,
                  skills: p.skills,
                  linkedin_url: p.linkedin_url,
                  github_url: p.github_url,
                  portfolio_url: p.portfolio_url,
                  location: p.location,
                  projectIds: p.projectIds,
                  hoursThisWeek: 0,
                  taskLoad: 0,
                  streak: 5,
                  attendance: 100,
                };
                return (
                  <tr key={p.user_id} className="border-t border-border hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setProfileDialog(true, p.user_id)}
                          className="cursor-pointer focus:outline-none transition-transform hover:scale-105"
                          title="View profile"
                        >
                          <PersonAvatar person={personObj} size="sm" showPresence />
                        </button>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setProfileDialog(true, p.user_id)}
                            className="font-semibold text-ink hover:text-accent cursor-pointer text-left block truncate"
                          >
                            {p.name}
                          </button>
                          <div className="font-mono text-[11px] text-muted truncate">{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-ink font-medium text-xs">{p.dept}</div>
                      <div className="text-muted text-[11px] truncate">{p.title}</div>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge value={p.role} />
                    </td>
                    <td className="px-3 py-3 capitalize text-xs text-muted">{p.presence}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isSuperAdmin && (
                          <>
                            <select
                              className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-ink"
                              value={p.role}
                              disabled={updateRole.isPending}
                              onChange={(e) => handleRoleChange(p.user_id, e.target.value as RoleType, p.name)}
                            >
                              {roles.map((r) => (
                                <option key={r} value={r}>
                                  {r.replace("_", " ")}
                                </option>
                              ))}
                            </select>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-muted hover:text-ink text-xs"
                              onClick={() => {
                                setResetTargetUser({ id: p.user_id, name: p.name });
                                setResetDialogOpen(true);
                              }}
                              title="Reset Password"
                            >
                              <KeyRound className="w-3.5 h-3.5 mr-1" />
                              Reset
                            </Button>

                            {p.user_id !== meData?.profile?.user_id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
                                onClick={() => handleDeleteUser(p.user_id, p.name)}
                                title="Delete user"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-xs border-border"
                          onClick={() => setProfileDialog(true, p.user_id)}
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          Profile
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* CREATE USER DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <UserPlus className="w-4 h-4 text-blue-400" />
              Create Engineering Account
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Provision credentials and a verified profile for a capstone student or faculty guide.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-3.5 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-300">Full Name *</Label>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                  className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-300">Email Address *</Label>
                <Input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="student@rvit.ac.in"
                  required
                  className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-300">Initial Password * (min 8 chars)</Label>
                <Input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="mt-1 bg-slate-900 border-slate-700 text-xs text-white font-mono"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-300">Role *</Label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as RoleType)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-xs text-white"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r === "member" ? "Intern (Member)" : r.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-300">Title</Label>
                <Input
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="e.g. Engineering Intern"
                  className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-300">Department</Label>
                <Input
                  value={createDept}
                  onChange={(e) => setCreateDept(e.target.value)}
                  placeholder="e.g. CSE / ECE"
                  className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-300">Year of Study</Label>
                <Input
                  value={createYear}
                  onChange={(e) => setCreateYear(e.target.value)}
                  placeholder="e.g. Year 3"
                  className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-300">Registration Number</Label>
                <Input
                  value={createRegNo}
                  onChange={(e) => setCreateRegNo(e.target.value)}
                  placeholder="e.g. RVIT-CS-2023-014"
                  className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-300">Phone Number</Label>
                <Input
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-300">College / Institution</Label>
                <Input
                  value={createCollege}
                  onChange={(e) => setCreateCollege(e.target.value)}
                  placeholder="RV Institute of Technology"
                  className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-800 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateDialogOpen(false)}
                disabled={createUser.isPending}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUser.isPending}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
              >
                {createUser.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* RESET PASSWORD DIALOG */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <KeyRound className="w-4 h-4 text-amber-400" />
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Set a new password for <span className="font-semibold text-white">{resetTargetUser?.name}</span>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs text-slate-300">New Password (min 8 chars) *</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                className="mt-1 bg-slate-900 border-slate-700 text-xs text-white font-mono"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-800 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setResetDialogOpen(false)}
                disabled={resetPassword.isPending}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={resetPassword.isPending}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium"
              >
                {resetPassword.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
