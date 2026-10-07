'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Key, FileText, Settings, Loader2, PlusCircle, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import LogoutButton from '@/app/components/logout-button'

interface License {
  key: string;
  status: boolean;
  role: 'user' | 'admin';
  credits: number;
  access_level: number;
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
      <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
        <p className="ml-3">Carregando Painel Admin...</p>
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
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-black text-zinc-100 px-4 py-6 sm:p-6 md:p-12">
      <header className="w-full max-w-5xl mx-auto mb-10 flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter text-white break-words">
          Admin <span className="text-blue-500">Dashboard</span>
        </h1>
        <LogoutButton variant="danger" />
      </header>

      <main className="w-full max-w-6xl mx-auto space-y-8 min-w-0">
        {/* Gestão de Keys */}
        <section className="bg-black/80 backdrop-blur-sm border-[0.5px] border-zinc-800 p-4 sm:p-8 rounded-3xl shadow-xl min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Key className="w-7 h-7 text-zinc-300" />
              <div>
                <h2 className="text-2xl font-bold text-white">Gestão de Keys</h2>
                <p className="text-zinc-400 text-sm">Crie, ative/desative, edite e delete License Keys.</p>
              </div>
            </div>
            <button
              onClick={() => { setShowCreateForm(!showCreateForm); setFormError(null); }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg inline-flex items-center gap-2 transition-all"
            >
              <PlusCircle className="w-5 h-5" />
              {showCreateForm ? 'Cancelar' : 'Criar Nova Key'}
            </button>
          </div>

          {formError && (
            <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {formError}
            </p>
          )}

          {/* Formulário de criação */}
          {showCreateForm && (
            <form
              onSubmit={handleCreateLicense}
              className="bg-zinc-950/60 border-[0.5px] border-zinc-800 rounded-2xl p-6 mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">License Key</label>
                <input
                  type="text"
                  className="w-full p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white font-mono placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: BBX-XXXX-XXXX-XXXX"
                  value={newLicenseData.key || ''}
                  onChange={(e) => setNewLicenseData({ ...newLicenseData, key: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Role</label>
                <select
                  className="w-full p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newLicenseData.role}
                  onChange={(e) => setNewLicenseData({ ...newLicenseData, role: e.target.value as 'user' | 'admin' })}
                >
                  <option value="user">user</option>
                  <option value="admin">admin (Key Mestra)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Créditos</label>
                <input
                  type="number"
                  min={0}
                  className="w-full p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newLicenseData.credits}
                  onChange={(e) => setNewLicenseData({ ...newLicenseData, credits: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Access Level</label>
                <input
                  type="number"
                  min={1}
                  className="w-full p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newLicenseData.access_level}
                  onChange={(e) => setNewLicenseData({ ...newLicenseData, access_level: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Expira em (opcional)</label>
                <input
                  type="datetime-local"
                  className="w-full p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newLicenseData.expires_at || ''}
                  onChange={(e) => setNewLicenseData({ ...newLicenseData, expires_at: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 text-zinc-400 text-sm">
                  <input
                    type="checkbox"
                    checked={newLicenseData.status}
                    onChange={(e) => setNewLicenseData({ ...newLicenseData, status: e.target.checked })}
                    className="w-4 h-4 accent-blue-600"
                  />
                  Ativa
                </label>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-lg transition-all"
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
                <tr className="text-zinc-500 uppercase text-xs tracking-widest border-b border-zinc-800">
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
                    <td colSpan={7} className="py-10 text-center text-zinc-500">
                      Nenhuma licença encontrada. Crie a primeira Key Mestra.
                    </td>
                  </tr>
                )}
                {licenses.map((lic) =>
                  editingLicense?.key === lic.key ? (
                    <tr key={lic.key} className="border-b border-zinc-800 bg-blue-500/5">
                      <td className="py-3 pr-4 font-mono text-white text-xs max-w-[140px] truncate" title={lic.key}>{lic.key}</td>
                      <td className="py-3 pr-4">
                        <input
                          type="checkbox"
                          checked={editingLicense.status}
                          onChange={(e) => setEditingLicense({ ...editingLicense, status: e.target.checked })}
                          className="w-4 h-4 accent-blue-600"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          value={editingLicense.role}
                          onChange={(e) => setEditingLicense({ ...editingLicense, role: e.target.value as 'user' | 'admin' })}
                          className="p-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                          className="w-20 p-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          min={1}
                          value={editingLicense.access_level}
                          onChange={(e) => setEditingLicense({ ...editingLicense, access_level: Number(e.target.value) })}
                          className="w-16 p-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 pr-4">{formatExpiresAt(lic.expires_at)}</td>
                      <td className="py-3 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => handleUpdateLicense(editingLicense)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1.5 px-3 rounded-md transition-all"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingLicense(null)}
                          className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-bold py-1.5 px-3 rounded-md transition-all"
                        >
                          Cancelar
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={lic.key} className="border-b border-zinc-800 hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 pr-4 font-mono text-white text-xs max-w-[140px] truncate" title={lic.key}>{lic.key}</td>
                      <td className="py-3 pr-4">
                        {lic.status ? (
                          <span className="text-emerald-400 text-xs font-bold">● Ativa</span>
                        ) : (
                          <span className="text-red-400 text-xs font-bold">● Inativa</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {lic.role === 'admin' ? (
                          <span className="text-yellow-400 text-xs font-bold bg-yellow-500/10 px-2 py-0.5 rounded-full">admin</span>
                        ) : (
                          <span className="text-zinc-400 text-xs font-bold bg-zinc-800 px-2 py-0.5 rounded-full">user</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-mono text-blue-400">{lic.credits} CR</td>
                      <td className="py-3 pr-4 font-mono text-zinc-300">Nv {lic.access_level}</td>
                      <td className="py-3 pr-4 text-zinc-400">{formatExpiresAt(lic.expires_at)}</td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => setEditingLicense({ ...lic })}
                            title="Editar"
                            className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateLicense({ ...lic, status: !lic.status })}
                            title={lic.status ? 'Desativar' : 'Ativar'}
                            className={`p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-all ${lic.status ? 'text-red-400' : 'text-emerald-400'}`}
                          >
                            {lic.status ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteLicense(lic.key)}
                            title="Deletar"
                            className="p-1.5 rounded-md bg-zinc-800 hover:bg-red-600 text-red-400 hover:text-white transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* CMS de Conteúdo */}
        <div className="bg-black/80 backdrop-blur-sm border-[0.5px] border-zinc-800 p-6 sm:p-8 rounded-3xl shadow-xl min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-7 h-7 text-zinc-300" />
            <h2 className="text-2xl font-bold text-white">CMS de Conteúdo</h2>
          </div>
          <p className="text-zinc-400 mb-6">Edite textos, gerencie aulas e links de ferramentas.</p>
          <Link href="#" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg inline-flex items-center transition-all">
            Editar Conteúdo
          </Link>
        </div>

        {/* Controle Global */}
        <div className="bg-black/80 backdrop-blur-sm border-[0.5px] border-zinc-800 p-6 sm:p-8 rounded-3xl shadow-xl lg:col-span-2 min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-7 h-7 text-zinc-300" />
            <h2 className="text-2xl font-bold text-white">Controle Global</h2>
          </div>
          <p className="text-zinc-400 mb-6">Coloque o site em modo de manutenção e gerencie avisos.</p>
          <button className="bg-red-700 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-all">
            Modo Manutenção
          </button>
          {/* Adicionar mais opções de controle global aqui */}
        </div>
      </main>
    </div>
  );
}