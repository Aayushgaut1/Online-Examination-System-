import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Database,
  X,
  RefreshCw,
  CheckCircle2,
  PlusCircle,
  HardDrive,
  Clock,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({ isOpen, onClose }) => {
  const [dbData, setDbData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'schema' | 'records' | 'tables' | 'er'>('schema');
  const [selectedTable, setSelectedTable] = useState<string>('users');
  const [recordsData, setRecordsData] = useState<{ table: string; count: number; rows: any[] } | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [resetting, setResetting] = useState(false);
  const toast = useToast();

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await api.getDatabaseStatus();
      setDbData(data);
    } catch (err: any) {
      toast.error('Failed to load database status');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async (table: string) => {
    try {
      setLoadingRecords(true);
      setSelectedTable(table);
      const data = await api.getDatabaseRecords(table);
      setRecordsData(data);
    } catch (err: any) {
      toast.error('Failed to load table records');
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'records') {
      fetchRecords(selectedTable);
    }
  }, [isOpen, activeTab, selectedTable]);

  const handleResetSeed = async () => {
    if (!window.confirm('Are you sure you want to reset all test exams, questions, and attempt records to default sample state?')) {
      return;
    }
    try {
      setResetting(true);
      await api.resetSeedDatabase();
      toast.success('Database has been reset and re-seeded with fresh sample data!');
      await fetchStatus();
      if (activeTab === 'records') {
        await fetchRecords(selectedTable);
      }
    } catch (err: any) {
      toast.error('Reset failed: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  const handleCreateNewDatabase = async () => {
    if (!window.confirm('Create a new clean database? This will re-initialize all 8 relational tables with clean sequences.')) {
      return;
    }
    try {
      setResetting(true);
      await api.recreateDatabase();
      toast.success('New database created and initialized successfully!');
      await fetchStatus();
      if (activeTab === 'records') {
        await fetchRecords(selectedTable);
      }
    } catch (err: any) {
      toast.error('Failed to create new database: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl glass-panel rounded-2xl border border-white/10 shadow-2xl p-6 sm:p-8 z-10 my-8 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white font-['Outfit'] flex items-center gap-2">
                  Database & Persistence Inspector
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    LIVE & PERSISTED
                  </span>
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono mt-1">
                  <span className="flex items-center gap-1 text-indigo-300">
                    <HardDrive className="w-3.5 h-3.5" />
                    {dbData?.engine || 'Persistent ACID Relational Engine'}
                  </span>
                  {dbData?.file_path && (
                    <span className="text-slate-500 hidden sm:inline">
                      • Storage: <span className="text-slate-300">{dbData.file_path}</span>
                    </span>
                  )}
                  {dbData?.last_saved_at && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Clock className="w-3.5 h-3.5" />
                      Disk Synced: {new Date(dbData.last_saved_at).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fetchStatus();
                  if (activeTab === 'records') fetchRecords(selectedTable);
                  toast.success('Database status reloaded!');
                }}
                disabled={loading}
                title="Reload Database State"
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pb-2 border-b border-white/5">
            <button
              onClick={() => setActiveTab('schema')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'schema'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Schema & Table Counts
            </button>
            <button
              onClick={() => {
                setActiveTab('records');
                fetchRecords(selectedTable);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'records'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Live Table Records Explorer
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'tables'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Table Columns & Constraints
            </button>
            <button
              onClick={() => setActiveTab('er')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'er'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              ER Diagram Map
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {activeTab === 'schema' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {dbData?.table_counts &&
                    Object.entries(dbData.table_counts).map(([table, count]: any) => (
                      <div
                        key={table}
                        onClick={() => {
                          setSelectedTable(table);
                          setActiveTab('records');
                        }}
                        className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-indigo-500/30 flex flex-col cursor-pointer transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-400 uppercase group-hover:text-indigo-300 transition-colors">
                            {table}
                          </span>
                          <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            View rows →
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-white font-['Outfit'] mt-1">{count}</span>
                        <span className="text-[10px] text-indigo-300 mt-0.5">Records stored</span>
                      </div>
                    ))}
                </div>

                <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ACID Persistence Layer Active
                  </div>
                  <p>
                    Every registration, exam creation, question update, attempt start, answer recording, and exam grading is written immediately to disk with full integrity.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    To integrate an external Supabase or PostgreSQL/MySQL cloud database, configure <code className="text-indigo-300">DATABASE_URL</code> or <code className="text-indigo-300">SUPABASE_URL</code> & <code className="text-indigo-300">SUPABASE_SERVICE_ROLE_KEY</code> in project environment variables.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'records' && (
              <div className="space-y-3">
                {/* Table selector buttons */}
                <div className="flex flex-wrap gap-2 pb-2 border-b border-white/5">
                  {['users', 'student', 'exam', 'question', 'option', 'attempt', 'answer', 'result'].map(tbl => {
                    const count = dbData?.table_counts?.[tbl] ?? 0;
                    return (
                      <button
                        key={tbl}
                        onClick={() => fetchRecords(tbl)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                          selectedTable === tbl
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="uppercase">{tbl}</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-slate-300">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Records table */}
                {loadingRecords ? (
                  <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Loading {selectedTable} records...</span>
                  </div>
                ) : recordsData && recordsData.rows && recordsData.rows.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/30">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-white/5 border-b border-white/10 text-slate-400">
                        <tr>
                          {Object.keys(recordsData.rows[0]).map(col => (
                            <th key={col} className="p-2.5 whitespace-nowrap font-bold text-slate-300">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-200">
                        {recordsData.rows.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                            {Object.entries(row).map(([key, val]: any, cIdx: number) => (
                              <td key={cIdx} className="p-2.5 whitespace-nowrap max-w-xs truncate text-[11px]">
                                {typeof val === 'boolean' ? (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${val ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                    {String(val)}
                                  </span>
                                ) : typeof val === 'object' && val !== null ? (
                                  JSON.stringify(val)
                                ) : val === null || val === undefined ? (
                                  <span className="text-slate-600 italic">null</span>
                                ) : (
                                  String(val)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 bg-white/[0.02] rounded-xl border border-white/5">
                    No records found in table <code className="text-indigo-400">{selectedTable}</code>.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'er' && (
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3 font-mono text-xs text-slate-300">
                <div className="text-indigo-400 font-bold mb-2">// Core Entity Relationships as Defined in Reference</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-amber-300 font-bold">EXAM (1)</span> ────► <span className="text-cyan-300 font-bold">QUESTION (N)</span>
                    <p className="text-[11px] text-slate-400 mt-1">Cascades on exam deletion</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-cyan-300 font-bold">QUESTION (1)</span> ────► <span className="text-emerald-300 font-bold">OPTION (N)</span>
                    <p className="text-[11px] text-slate-400 mt-1">Exactly one correct option marked</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-violet-300 font-bold">STUDENT (1)</span> ────► <span className="text-blue-300 font-bold">ATTEMPT (N)</span>
                    <p className="text-[11px] text-slate-400 mt-1">Tracks start time, end time, and status</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-blue-300 font-bold">ATTEMPT (1)</span> ────► <span className="text-purple-300 font-bold">ANSWER (N)</span>
                    <p className="text-[11px] text-slate-400 mt-1">Dependent on attempt, references question & option</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 sm:col-span-2">
                    <span className="text-blue-300 font-bold">ATTEMPT (1)</span> ────► <span className="text-emerald-300 font-bold">RESULT (1)</span>
                    <p className="text-[11px] text-slate-400 mt-1">1:1 Strict relational auto-grading outcome (Score, Percentage, Pass Status)</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tables' && (
              <div className="space-y-3">
                {dbData?.schema_tables?.map((tbl: any) => (
                  <div key={tbl.name} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white font-mono uppercase">{tbl.name}</span>
                      <span className="text-xs text-slate-400">{tbl.rows} rows</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tbl.columns.map((col: string) => (
                        <span
                          key={col}
                          className={`text-[11px] px-2 py-0.5 rounded-md font-mono ${
                            col.includes('(PK)')
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : col.includes('(FK)')
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : col.includes('(UQ)')
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-white/5 text-slate-300'
                          }`}
                        >
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              {dbData?.is_postgres ? (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Connected to PostgreSQL / Supabase — Schema Active
                </div>
              ) : (
                <>
                  <button
                    onClick={handleCreateNewDatabase}
                    disabled={resetting}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <PlusCircle className="w-4 h-4 text-indigo-400" />
                    Initialize New Clean Database
                  </button>
                  <button
                    onClick={handleResetSeed}
                    disabled={resetting}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
                    Reset & Re-Seed
                  </button>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
