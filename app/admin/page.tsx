'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Key, FileText, Settings, LifeBuoy, Loader2, PlusCircle, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import LogoutButton from '@/app/components/logout-button'
import { AppShell } from '@/app/components/app-shell'
import { PageHeader, Panel, StatusPill, ErrorBanner } from '@/app/components/qc-ui'

interface License {
  key: string;
  status: boolean;
  role: 'user' | 'admin';
  credits: number;
  access_level: number;
  total_spent: number | null;
  level: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLicenseData, setNewLicenseData] = useState<Partial<License>>({
    key: '', status: true, role: 'user', credits: 0, access_level: 1, expires_at: ''
  });
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchLicenses = async () => {
    setLoading(true);
    setFormError(null);
    try {
      const response = await fetch('/api/licenses');
      if (!response.ok) {
        throw new Error('Failed to fetch licenses');
      }
      const data: License[] = await response.json();
      setLicenses(data);
    } catch (error: any) {
      setFormError(error.message);
      console.error('Error fetching licenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
  }, []);

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!newLicenseData.key) {
      setFormError('License Key é obrigatória.');
      return;
    }

    try {
      const response = await fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLicenseData,
          expires_at: newLicenseData.expires_at ? new Date(newLicenseData.expires_at).toISOString() : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar licença.');
      }
      setNewLicenseData({ key: '', status: true, role: 'user', credits: 0, access_level: 1, expires_at: '' });
      setShowCreateForm(false);
      fetchLicenses(); // Refresh list
    } catch (error: any) {
      setFormError(error.message);
      console.error('Error creating license:', error);
    }
  };

  const handleUpdateLicense = async (licenseToUpdate: License) => {
    setFormError(null);
    try {
      const response = await fetch(`/api/licenses/${licenseToUpdate.key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...licenseToUpdate,
          expires_at: licenseToUpdate.expires_at ? new Date(licenseToUpdate.expires_at).toISOString() : null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao atualizar licença.');
      }
      setEditingLicense(null);
      fetchLicenses(); // Refresh list
    } catch (error: any) {
      setFormError(error.message);
      console.error('Error updating license:', error);
    }
  };

  const handleDeleteLicense = async (key: string) => {
    if (!confirm(`Tem certeza que deseja deletar a licença ${key}?`)) return;
    setFormError(null);
    try {
      const response = await fetch(`/api/licenses/${key}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao deletar licença.');
      }
      fetchLicenses(); // Refresh list
    } catch (error: any) {
      setFormError(error.message);
      console.error('Error deleting license:', error);
    }
  };

  const formatExpiresAt = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-bg text-muted">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <p className="font-mono text-sm">Carregando Painel Admin...</p>
      </div>
    );
  }

  // Middleware should handle non-admin access, but a client-side check can be a fallback
  // if (licenseRole !== 'admin') {
  //   // This part should ideally not be reached if middleware works correctly
  //   router.push('/'); 
  //   return null;
  // }

  return (
    <AppShell>
      <PageHeader
        eyebrow="BlackBox Vault"
        title="Admin Dashboard"
        subtitle="Gerencie License Keys, créditos e permissões da plataforma."
        icon={<Key className="h-5 w-5" />}
        actions={<LogoutButton variant="danger" />}
      />

      <main className="w-full min-w-0 space-y-8">
        {/* Setor de Suporte */}
        <Panel className="p-4 sm:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <LifeBuoy className="h-6 w-6 text-accent" />
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Setor de Suporte</h2>
                <p className="text-sm text-muted">Responda tickets com contexto automático do cliente.</p>
              </div>
            </div>
            <Link href="/admin/suporte" className="btn btn-primary">
              Abrir tickets
            </Link>
          </div>
        </Panel>

        {/* Gestão de Keys */}
        <Panel className="p-4 sm:p-8">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <Key className="h-6 w-6 text-accent" />
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Gestão de Keys</h2>
                <p className="text-sm text-muted">Crie, ative/desative, edite e delete License Keys.</p>
              </div>
            </div>
            <button
              onClick={() => { setShowCreateForm(!showCreateForm); setFormError(null); }}
              className="btn btn-primary"
            >
              <PlusCircle className="h-4 w-4" />
              {showCreateForm ? 'Cancelar' : 'Criar Nova Key'}
            </button>
          </div>

          {formError && <ErrorBanner message={formError} />}

          {/* Formulário de criação */}
          {showCreateForm && (
            <form
              onSubmit={handleCreateLicense}
              className="mb-8 grid gap-4 rounded-xl border border-line bg-raised/50 p-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="label">License Key</label>
                <input
                  type="text"
                  className="input font-mono"
                  placeholder="Ex: BBX-XXXX-XXXX-XXXX"
                  value={newLicenseData.key || ''}
                  onChange={(e) => setNewLicenseData({ ...newLicenseData, key: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  className="input"
                  value={newLicenseData.role}
                  onChange={(e) => setNewLicenseData({ ...newLicenseData, role: e.target.value as 'user' | 'admin' })}
                >
                  <option value="user">user</option>
                  <option value="admin">admin (Key Mestra)</option>
                </select>
              </div>
              <div>
                <label className="label">Créditos</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={newLicenseData.credits}
                  onChange={(e) => setNewLicenseData({ ...newLicenseData, credits: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Access Level</label>
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={newLicenseData.access_level}
                  onChange={(e) => setNewLicenseData({ ...newLicenseData, access_level: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Expira em (opcional)</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={newLicenseData.expires_at || ''}
                  onChange={(e) => setNewLicenseData({ ...newLicenseData, expires_at: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={newLicenseData.status}
                    onChange={(e) => setNewLicenseData({ ...newLicenseData, status: e.target.checked })}
                    className="h-4 w-4 accent-accent"
                  />
                  Ativa
                </label>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <button
                  type="submit"
                  className="btn btn-primary w-full"
                >
                  Criar Key
                </button>
              </div>
            </form>
          )}

          {/* Tabela de Licenças */}
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-widest text-faint">
                  <th className="py-3 pr-4">Key</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Role</th>
                  <th className="py-3 pr-4">Credits</th>
                  <th className="py-3 pr-4">Nível</th>
                  <th className="py-3 pr-4">Expira em</th>
                  <th className="py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {licenses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-faint">
                      Nenhuma licença encontrada. Crie a primeira Key Mestra.
                    </td>
                  </tr>
                )}
                {licenses.map((lic) =>
                  editingLicense?.key === lic.key ? (
                    <tr key={lic.key} className="border-b border-line bg-accent/5">
                      <td className="max-w-[140px] truncate py-3 pr-4 font-mono text-xs text-ink" title={lic.key}>{lic.key}</td>
                      <td className="py-3 pr-4">
                        <input
                          type="checkbox"
                          checked={editingLicense.status}
                          onChange={(e) => setEditingLicense({ ...editingLicense, status: e.target.checked })}
                          className="h-4 w-4 accent-accent"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          value={editingLicense.role}
                          onChange={(e) => setEditingLicense({ ...editingLicense, role: e.target.value as 'user' | 'admin' })}
                          className="input px-2 py-1.5 text-xs"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          min={0}
                          value={editingLicense.credits}
                          onChange={(e) => setEditingLicense({ ...editingLicense, credits: Number(e.target.value) })}
                          className="input w-20 px-2 py-1.5 text-xs"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          min={1}
                          value={editingLicense.access_level}
                          onChange={(e) => setEditingLicense({ ...editingLicense, access_level: Number(e.target.value) })}
                          className="input w-16 px-2 py-1.5 text-xs"
                        />
                      </td>
                      <td className="py-3 pr-4">{formatExpiresAt(lic.expires_at)}</td>
                      <td className="space-x-2 whitespace-nowrap py-3 text-right">
                        <button
                          onClick={() => handleUpdateLicense(editingLicense)}
                          className="btn btn-primary px-3 py-1.5 text-xs"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingLicense(null)}
                          className="btn btn-ghost px-3 py-1.5 text-xs"
                        >
                          Cancelar
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={lic.key} className="border-b border-line transition-colors hover:bg-raised/40">
                      <td className="max-w-[140px] truncate py-3 pr-4 font-mono text-xs text-ink" title={lic.key}>{lic.key}</td>
                      <td className="py-3 pr-4">
                        <StatusPill label={lic.status ? 'Ativa' : 'Inativa'} tone={lic.status ? 'good' : 'danger'} />
                      </td>
                      <td className="py-3 pr-4">
                        {lic.role === 'admin' ? (
                          <span className="rounded-md border border-warn/40 bg-warn/10 px-2 py-0.5 font-mono text-xs font-bold text-warn">admin</span>
                        ) : (
                          <span className="chip">user</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-mono text-accent">
                        {lic.credits} CR
                        {(lic.level || lic.total_spent != null) && (
                          <span className="block font-sans text-[11px] font-semibold text-muted">
                            {lic.level ?? 'Bronze'} · {(lic.total_spent ?? 0)} gastos
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-mono text-muted">Nv {lic.access_level}</td>
                      <td className="py-3 pr-4 text-muted">{formatExpiresAt(lic.expires_at)}</td>
                      <td className="whitespace-nowrap py-3 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => setEditingLicense({ ...lic })}
                            title="Editar"
                            className="rounded-md border border-line bg-raised/70 p-1.5 text-muted transition-all hover:border-accent/40 hover:text-ink"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateLicense({ ...lic, status: !lic.status })}
                            title={lic.status ? 'Desativar' : 'Ativar'}
                            className={`rounded-md border border-line bg-raised/70 p-1.5 transition-all hover:border-accent/40 ${lic.status ? 'text-danger' : 'text-good'}`}
                          >
                            {lic.status ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteLicense(lic.key)}
                            title="Deletar"
                            className="rounded-md border border-danger/40 bg-danger/10 p-1.5 text-danger transition-all hover:bg-danger/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* CMS de Conteúdo */}
        <Panel className="p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <FileText className="h-6 w-6 text-accent" />
            <h2 className="font-display text-xl font-bold text-ink">CMS de Conteúdo</h2>
          </div>
          <p className="mb-6 text-sm text-muted">Edite textos, gerencie aulas e links de ferramentas.</p>
          <Link href="#" className="btn btn-primary">
            Editar Conteúdo
          </Link>
        </Panel>

        {/* Controle Global */}
        <Panel className="p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <Settings className="h-6 w-6 text-accent" />
            <h2 className="font-display text-xl font-bold text-ink">Controle Global</h2>
          </div>
          <p className="mb-6 text-sm text-muted">Coloque o site em modo de manutenção e gerencie avisos.</p>
          <button className="btn btn-danger">
            Modo Manutenção
          </button>
          {/* Adicionar mais opções de controle global aqui */}
        </Panel>
      </main>
    </AppShell>
  );
}