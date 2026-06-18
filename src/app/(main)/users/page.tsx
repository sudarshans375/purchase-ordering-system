// src/app/(main)/users/page.tsx — Users management page
// Author: Sudarshan Sonawane

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { Plus, Search, Users, Shield, ShieldAlert, Eye, EyeOff, Trash2, Edit, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, ApiError } from "@/hooks/use-api";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  const body = await res.json();
  if (!res.ok) {
    const error = body.error || { code: "UNKNOWN", message: "An error occurred." };
    throw new ApiError(res.status, error.code, error.message, error.details);
  }
  return body.data;
}

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "manager",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "manager",
    isActive: true,
  });
  const [formError, setFormError] = useState("");
  const queryClient = useQueryClient();

  const searchParams = new URLSearchParams();
  if (search) searchParams.set("search", search);
  searchParams.set("page", String(page));
  searchParams.set("pageSize", "20");

  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKeys.dashboard, "users", { search, page }],
    queryFn: () => apiFetch<any>(`/api/users?${searchParams.toString()}`),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiFetch<any>("/api/users", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.dashboard, "users"] });
      setAddOpen(false);
      setFormData({ name: "", email: "", password: "", role: "manager" });
    },
    onError: (err: any) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiFetch<any>("/api/users", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.dashboard, "users"] });
      setEditOpen(false);
      setEditUser(null);
    },
    onError: (err: any) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<any>(`/api/users?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.dashboard, "users"] });
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
      setFormError("All fields are required.");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!editUser) return;

    const updateData: any = {
      id: editUser.id,
      name: editFormData.name,
      email: editFormData.email,
      role: editFormData.role,
      isActive: editFormData.isActive,
    };
    if (editFormData.password) {
      updateData.password = editFormData.password;
    }
    updateMutation.mutate(updateData);
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      isActive: user.isActive,
    });
    setFormError("");
    setEditOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete user "${name}"? This action cannot be undone.`)) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Users</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage system users and their roles
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
              <DialogDescription>
                Create a new user with access to the system.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="e.g. John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                placeholder="john@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button type="submit" loading={createMutation.isPending}>Create User</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 h-10 rounded-lg border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={5} /></div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">Failed to load users.</div>
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              title="No users yet"
              description="Add your first user to the system."
              icon={<Users className="h-6 w-6" />}
              action={{ label: "Add User", onClick: () => setAddOpen(true) }}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-zinc-900">{user.name}</TableCell>
                      <TableCell className="text-zinc-500">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "success" : user.role === "manager" ? "default" : "info"}>
                          {user.role === "admin" ? <ShieldAlert className="h-3 w-3 mr-1" /> : <Shield className="h-3 w-3 mr-1" />}
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "success" : "cancelled"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-500 text-sm">{formatDate(user.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(user)} title="Edit user">
                            <Edit className="h-4 w-4 text-zinc-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(user.id, user.name)}
                            title="Delete user"
                            loading={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
                  <p className="text-sm text-zinc-500">Page {data.page} of {data.totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details and role.</DialogDescription>
          </DialogHeader>
          {editUser && (
            <form onSubmit={handleEdit} className="space-y-4">
              <Input label="Full Name" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} required />
              <Input label="Email" type="email" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} required />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">New Password (leave empty to keep current)</label>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    placeholder="Leave empty to keep current"
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                    {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">Role</label>
                <select value={editFormData.role} onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400">
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={editFormData.isActive} onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                  className="rounded border-zinc-300" />
                <label htmlFor="isActive" className="text-sm text-zinc-700">Account Active</label>
              </div>
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit" loading={updateMutation.isPending}>Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
