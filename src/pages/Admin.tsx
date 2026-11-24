import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  LogOut,
  RefreshCw,
  Search,
  X,
  AlertCircle,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import type {
  Lead,
  LeadEventRecord,
  LeadStatus,
  RecommendationRecord,
  RefinementAnswerRecord,
} from '../lib/schemas';

const STATUS_OPTIONS: Array<{ value: '' | LeadStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'started', label: 'Started' },
  { value: 'completed', label: 'Completed' },
  { value: 'viewed_offer', label: 'Viewed offer' },
  { value: 'whatsapp_clicked', label: 'WhatsApp clicked' },
  { value: 'declined', label: 'Declined' },
  { value: 'paid', label: 'Paid' },
];

const TRACK_OPTIONS = [
  { value: '', label: 'All tracks' },
  { value: 'digital', label: 'Digital' },
  { value: 'physical', label: 'Physical' },
  { value: 'both', label: 'Both' },
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function csvEscape(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function Admin() {
  const navigate = useNavigate();

  const [authChecked, setAuthChecked] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [trackFilter, setTrackFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected lead detail modal
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [leadRecs, setLeadRecs] = useState<RecommendationRecord[]>([]);
  const [leadRefinements, setLeadRefinements] = useState<RefinementAnswerRecord[]>([]);
  const [leadEvents, setLeadEvents] = useState<LeadEventRecord[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadLeads = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchErr) {
      setError(fetchErr.message || 'Failed to load leads.');
    } else {
      setLeads((data as Lead[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      navigate('/admin/login', { replace: true });
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) {
        navigate('/admin/login', { replace: true });
        return;
      }

      const { data: adminRow } = await supabase!
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!adminRow) {
        await supabase!.auth.signOut();
        navigate('/admin/login', { replace: true });
        return;
      }

      setAuthChecked(true);
      void loadLeads();
    });
  }, [loadLeads, navigate]);

  const openLeadDetail = async (lead: Lead) => {
    setSelectedLead(lead);
    if (!supabase) return;
    setDetailLoading(true);
    const [recsRes, refRes, evRes] = await Promise.all([
      supabase
        .from('recommendations')
        .select('*')
        .eq('lead_id', lead.id)
        .order('round', { ascending: true }),
      supabase
        .from('refinement_answers')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('events')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: true }),
    ]);

    setLeadRecs((recsRes.data as RecommendationRecord[]) || []);
    setLeadRefinements((refRes.data as RefinementAnswerRecord[]) || []);
    setLeadEvents((evRes.data as LeadEventRecord[]) || []);
    setDetailLoading(false);
  };

  const handleStatusUpdate = async (leadId: string, nextStatus: LeadStatus) => {
    if (!supabase) return;
    setUpdatingStatus(true);
    const { error: updErr } = await supabase
      .from('leads')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', leadId);

    if (!updErr) {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: nextStatus } : l))
      );
      setSelectedLead((prev) =>
        prev && prev.id === leadId ? { ...prev, status: nextStatus } : prev
      );
    }
    setUpdatingStatus(false);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (statusFilter && lead.status !== statusFilter) return false;
      if (trackFilter && lead.track !== trackFilter) return false;
      if (dateFrom) {
        const fromTs = new Date(`${dateFrom}T00:00:00`).getTime();
        if (new Date(lead.created_at).getTime() < fromTs) return false;
      }
      if (dateTo) {
        const toTs = new Date(`${dateTo}T23:59:59`).getTime();
        if (new Date(lead.created_at).getTime() > toTs) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${lead.first_name} ${lead.email} ${lead.country || ''} ${lead.chosen_path || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [dateFrom, dateTo, leads, searchQuery, statusFilter, trackFilter]);

  const counts = useMemo(() => {
    const completedStatuses: LeadStatus[] = [
      'completed',
      'viewed_offer',
      'whatsapp_clicked',
      'declined',
      'paid',
    ];
    const offerStatuses: LeadStatus[] = [
      'viewed_offer',
      'whatsapp_clicked',
      'declined',
      'paid',
    ];
    const waStatuses: LeadStatus[] = ['whatsapp_clicked', 'paid'];

    return {
      total: leads.length,
      completed: leads.filter((l) => completedStatuses.includes(l.status)).length,
      offerViewed: leads.filter((l) => offerStatuses.includes(l.status)).length,
      whatsappClicked: leads.filter((l) => waStatuses.includes(l.status)).length,
    };
  }, [leads]);

  const exportCsv = () => {
    const headers = [
      'Lead ID',
      'Created',
      'First Name',
      'Email',
      'Age',
      'Country',
      'Track',
      'Current Title',
      'Current Industry',
      'Fulfilment',
      'Chosen Path',
      'Status',
      'Refine Rounds',
      'UTM Source',
    ];

    const rows = filteredLeads.map((l) => [
      l.id,
      l.created_at,
      l.first_name,
      l.email,
      l.age,
      l.country,
      l.track,
      l.current_title,
      l.current_industry,
      l.fulfilment,
      l.chosen_path,
      l.status,
      l.refine_rounds,
      l.utm_source,
    ]);

    const csvContent = [
      headers.map(csvEscape).join(','),
      ...rows.map((r) => r.map(csvEscape).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pathshift-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate('/admin/login', { replace: true });
  };

  if (!authChecked) {
    return (
      <Layout maxWidth="wide">
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 bg-white border border-[#E8E6E0] rounded-[16px] animate-pulse"
              />
            ))}
          </div>
          <div className="h-80 bg-white border border-[#E8E6E0] rounded-[16px] animate-pulse" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      maxWidth="wide"
      headerRight={
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="min-h-[40px] px-3.5 rounded-[10px] border border-[#E8E6E0] bg-white hover:bg-[#FAFAF7] text-sm font-medium text-[#1C1917] inline-flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-[#6B6A65]" aria-hidden="true" />
          <span>Sign out</span>
        </button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-[34px] font-bold text-[#1C1917]">
              Leads overview
            </h1>
            <p className="text-sm text-[#6B6A65] mt-1">
              Review assessment responses, coaching interest, and export leads.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void loadLeads()}
              className="min-h-[44px] px-4 rounded-[12px] border border-[#E8E6E0] bg-white hover:bg-[#FAFAF7] text-sm font-medium text-[#1C1917] inline-flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={filteredLeads.length === 0}
              className="min-h-[44px] px-4 rounded-[12px] bg-[#0F766E] hover:bg-[#115E59] disabled:bg-[#0F766E]/40 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Count Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total leads', value: counts.total },
            { label: 'Completed', value: counts.completed },
            { label: 'Offer viewed', value: counts.offerViewed },
            { label: 'WhatsApp clicked', value: counts.whatsappClicked },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white border border-[#E8E6E0] rounded-[16px] p-5"
            >
              <p className="text-sm font-medium text-[#6B6A65]">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-[#1C1917] tabular-nums">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white border border-[#E8E6E0] rounded-[16px] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <label htmlFor="admin-search" className="sr-only">
              Search leads
            </label>
            <Search
              className="w-4 h-4 text-[#6B6A65] absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              id="admin-search"
              type="text"
              placeholder="Search name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-3 rounded-[10px] border border-[#E8E6E0] text-sm text-[#1C1917] focus:border-[#0F766E] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="filter-status" className="sr-only">
              Filter by status
            </label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-[10px] border border-[#E8E6E0] text-sm text-[#1C1917] bg-white focus:border-[#0F766E] focus:outline-none"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-track" className="sr-only">
              Filter by track
            </label>
            <select
              id="filter-track"
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-[10px] border border-[#E8E6E0] text-sm text-[#1C1917] bg-white focus:border-[#0F766E] focus:outline-none"
            >
              {TRACK_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-from" className="sr-only">
              From date
            </label>
            <input
              id="filter-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-[10px] border border-[#E8E6E0] text-sm text-[#1C1917] bg-white focus:border-[#0F766E] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="filter-to" className="sr-only">
              To date
            </label>
            <input
              id="filter-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-[10px] border border-[#E8E6E0] text-sm text-[#1C1917] bg-white focus:border-[#0F766E] focus:outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-[#E8E6E0] rounded-[16px] overflow-hidden">
          {error ? (
            <div className="p-10 text-center space-y-3">
              <AlertCircle className="w-7 h-7 text-[#DC2626] mx-auto" />
              <p className="text-sm text-[#DC2626]">{error}</p>
              <button
                type="button"
                onClick={() => void loadLeads()}
                className="min-h-[44px] px-5 rounded-[10px] bg-[#0F766E] text-white text-sm font-medium cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-[#FAFAF7] rounded-[10px] animate-pulse"
                />
              ))}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-base font-semibold text-[#1C1917]">
                No leads match your filters
              </p>
              <p className="text-sm text-[#6B6A65] mt-1">
                {leads.length === 0
                  ? 'Completed and in-progress assessments will appear here automatically.'
                  : 'Try clearing one of your filters to see all leads.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E8E6E0] bg-[#FAFAF7] text-xs font-semibold text-[#6B6A65]">
                    <th className="py-3.5 px-4">Name</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Country</th>
                    <th className="py-3.5 px-4">Track</th>
                    <th className="py-3.5 px-4">Fulfilment</th>
                    <th className="py-3.5 px-4">Chosen path</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6E0] text-sm">
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => void openLeadDetail(lead)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          void openLeadDetail(lead);
                        }
                      }}
                      className="hover:bg-[#FAFAF7] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-medium text-[#1C1917] whitespace-nowrap">
                        {lead.first_name}
                      </td>
                      <td className="py-3.5 px-4 text-[#6B6A65] whitespace-nowrap">
                        {lead.email}
                      </td>
                      <td className="py-3.5 px-4 text-[#1C1917] whitespace-nowrap">
                        {lead.country || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-[#6B6A65] capitalize whitespace-nowrap">
                        {lead.track || '—'}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums text-[#1C1917] whitespace-nowrap">
                        {lead.fulfilment ? `${lead.fulfilment}/10` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-[#1C1917] max-w-[220px] truncate">
                        {lead.chosen_path || '—'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-[#0F766E]">
                        {formatStatusLabel(lead.status)}
                      </td>
                      <td className="py-3.5 px-4 text-[#6B6A65] tabular-nums whitespace-nowrap">
                        {formatDate(lead.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-detail-title"
          onClick={() => setSelectedLead(null)}
        >
          <div
            className="bg-white h-full w-full max-w-xl overflow-y-auto p-6 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E8E6E0]">
              <div>
                <h2
                  id="lead-detail-title"
                  className="text-xl font-bold text-[#1C1917]"
                >
                  {selectedLead.first_name}
                </h2>
                <p className="text-sm text-[#6B6A65]">
                  {selectedLead.email} · {selectedLead.country || 'Unknown country'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                aria-label="Close lead details"
                className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 rounded-[10px] flex items-center justify-center text-[#6B6A65] hover:text-[#1C1917] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-6 text-sm">
              {/* Status switcher */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#E8E6E0]">
                <label
                  htmlFor="detail-status"
                  className="font-semibold text-[#1C1917]"
                >
                  Lead status
                </label>
                <select
                  id="detail-status"
                  value={selectedLead.status}
                  disabled={updatingStatus}
                  onChange={(e) =>
                    void handleStatusUpdate(
                      selectedLead.id,
                      e.target.value as LeadStatus
                    )
                  }
                  className="min-h-[42px] px-3 rounded-[10px] border border-[#E8E6E0] bg-white text-sm font-medium text-[#1C1917]"
                >
                  {STATUS_OPTIONS.filter((o) => o.value).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Profile & Answers */}
              <section className="space-y-2.5">
                <h3 className="font-semibold text-[#1C1917]">
                  Assessment answers
                </h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                  <div>
                    <dt className="text-[#6B6A65] text-xs">Age</dt>
                    <dd className="font-medium tabular-nums">
                      {selectedLead.age ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6B6A65] text-xs">Track</dt>
                    <dd className="font-medium capitalize">
                      {selectedLead.track || '—'}
                      {selectedLead.physical_industry
                        ? ` (${selectedLead.physical_industry})`
                        : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6B6A65] text-xs">Current role</dt>
                    <dd className="font-medium">
                      {selectedLead.current_title || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6B6A65] text-xs">Years in role</dt>
                    <dd className="font-medium">
                      {selectedLead.years_in_role || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6B6A65] text-xs">Current industry</dt>
                    <dd className="font-medium">
                      {selectedLead.current_industry || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6B6A65] text-xs">Fulfilment</dt>
                    <dd className="font-medium tabular-nums">
                      {selectedLead.fulfilment
                        ? `${selectedLead.fulfilment} / 10`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6B6A65] text-xs">Min income</dt>
                    <dd className="font-medium">
                      {selectedLead.min_income || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6B6A65] text-xs">Hours / week</dt>
                    <dd className="font-medium">
                      {selectedLead.hours_per_week || '—'}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[#6B6A65] text-xs">Drains</dt>
                    <dd className="font-medium">
                      {selectedLead.drains?.join(', ') || '—'}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[#6B6A65] text-xs">Top 3 strengths</dt>
                    <dd className="font-medium">
                      {selectedLead.strengths?.join(', ') || '—'}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[#6B6A65] text-xs">Biggest fear</dt>
                    <dd className="font-medium">
                      {selectedLead.biggest_fear || '—'}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[#6B6A65] text-xs">Skills & education</dt>
                    <dd className="font-medium">
                      {selectedLead.skills_education || '—'}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[#6B6A65] text-xs">Past loves</dt>
                    <dd className="font-medium">
                      {selectedLead.past_loves || '—'}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[#6B6A65] text-xs">Chosen path</dt>
                    <dd className="font-semibold text-[#0F766E]">
                      {selectedLead.chosen_path || 'Not chosen yet'}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Recommendations */}
              <section className="space-y-3 pt-4 border-t border-[#E8E6E0]">
                <h3 className="font-semibold text-[#1C1917]">
                  AI recommendations & ratings
                </h3>
                {detailLoading ? (
                  <div className="h-24 bg-[#FAFAF7] rounded-[12px] animate-pulse" />
                ) : leadRecs.length === 0 ? (
                  <p className="text-[#6B6A65]">No recommendations generated yet.</p>
                ) : (
                  leadRecs.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-4 rounded-[12px] bg-[#FAFAF7] border border-[#E8E6E0] space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs text-[#6B6A65]">
                        <span className="font-semibold text-[#1C1917]">
                          Round {rec.round}
                        </span>
                        <span>{rec.model_used || 'Unknown model'}</span>
                      </div>
                      <ul className="space-y-1.5">
                        {(rec.options || []).map((opt, idx) => (
                          <li
                            key={idx}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="font-medium text-[#1C1917]">
                              {idx + 1}. {opt.title} ({opt.track})
                            </span>
                            <span className="text-xs font-semibold text-[#0F766E] tabular-nums shrink-0">
                              {rec.ratings?.[String(idx + 1)]
                                ? `Rated ${rec.ratings[String(idx + 1)]}/5`
                                : 'Unrated'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </section>

              {/* Refinement Answers */}
              {leadRefinements.length > 0 && (
                <section className="space-y-2.5 pt-4 border-t border-[#E8E6E0]">
                  <h3 className="font-semibold text-[#1C1917]">
                    Refinement answers
                  </h3>
                  {leadRefinements.map((ref) => (
                    <div
                      key={ref.id}
                      className="p-3.5 rounded-[12px] bg-[#FAFAF7] border border-[#E8E6E0]"
                    >
                      <p className="text-xs text-[#6B6A65]">
                        Round {ref.round} · {ref.question}
                      </p>
                      <p className="mt-1 font-medium text-[#1C1917]">
                        {ref.answer}
                      </p>
                    </div>
                  ))}
                </section>
              )}

              {/* Events */}
              <section className="space-y-2 pt-4 border-t border-[#E8E6E0]">
                <h3 className="font-semibold text-[#1C1917]">Event timeline</h3>
                {detailLoading ? (
                  <div className="h-16 bg-[#FAFAF7] rounded-[12px] animate-pulse" />
                ) : leadEvents.length === 0 ? (
                  <p className="text-[#6B6A65]">No events recorded.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {leadEvents.map((ev) => (
                      <li
                        key={ev.id}
                        className="flex items-center justify-between gap-2 text-xs py-1"
                      >
                        <span className="font-medium text-[#1C1917]">
                          {formatStatusLabel(ev.event)}
                        </span>
                        <span className="text-[#6B6A65] tabular-nums">
                          {formatDateTime(ev.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
