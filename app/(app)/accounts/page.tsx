'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Plus, Edit, Trash2, Eye, EyeOff, TrendingUp, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/store/auth';

const AccountsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('schedules');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Data state
  const [schedules, setSchedules] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  // UI state
  const [scheduleDetailId, setScheduleDetailId] = useState<string>('');
  const [editingScheduleId, setEditingScheduleId] = useState<string>('');
  const [paymentDetailId, setPaymentDetailId] = useState<string>('');
  const [creditDetailId, setCreditDetailId] = useState<string>('');

  // Form state
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showCreditForm, setShowCreditForm] = useState(false);

  const [newSchedule, setNewSchedule] = useState({
    jobId: '',
    items: [{ milestone: 'Deposit', percentage: 50, amount: 0, dueDate: '', notes: '' }],
  });

  const [newPayment, setNewPayment] = useState({
    invoiceId: '',
    jobId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    method: 'Bank transfer',
    reference: '',
    receiptNumber: '',
    notes: '',
  });

  const [newCredit, setNewCredit] = useState({
    invoiceId: '',
    amount: 0,
    reason: '',
    isRefund: false,
    creditDate: new Date().toISOString().split('T')[0],
  });

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

      const [schedulesRes, paymentsRes, receivablesRes, creditsRes, jobsRes, invoicesRes] = await Promise.all([
        fetch('/api/accounts/schedules', { headers }).then(r => r.json()),
        fetch('/api/accounts/payments', { headers }).then(r => r.json()),
        fetch('/api/accounts/ar', { headers }).then(r => r.json()),
        fetch('/api/accounts/credit-notes', { headers }).then(r => r.json()),
        fetch('/api/jobs', { headers }).then(r => r.json()),
        fetch('/api/invoices', { headers }).then(r => r.json()),
      ]);

      setSchedules(Array.isArray(schedulesRes) ? schedulesRes : []);
      setPayments(Array.isArray(paymentsRes) ? paymentsRes : []);
      setReceivables(Array.isArray(receivablesRes) ? receivablesRes : []);
      setCreditNotes(Array.isArray(creditsRes) ? creditsRes : []);
      setJobs(Array.isArray(jobsRes) ? jobsRes : []);
      setInvoices(Array.isArray(invoicesRes) ? invoicesRes : []);
    } catch (err) {
      setError(`Failed to load accounts data: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/accounts/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newSchedule),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to create schedule');
      }

      setSuccess('Payment schedule created successfully');
      setShowScheduleForm(false);
      setNewSchedule({
        jobId: '',
        items: [{ milestone: 'Deposit', percentage: 50, amount: 0, dueDate: '', notes: '' }],
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSchedule = async (scheduleId: string) => {
    try {
      setLoading(true);
      setError('');

      const schedule = schedules.find(s => s.id === scheduleId);
      if (!schedule) return;

      const response = await fetch(`/api/accounts/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ items: schedule.items }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to update schedule');
      }

      setSuccess('Payment schedule updated successfully');
      setEditingScheduleId('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Delete this payment schedule?')) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/accounts/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to delete');

      setSuccess('Payment schedule deleted');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/accounts/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newPayment),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to create payment');
      }

      setSuccess('Payment recorded successfully');
      setShowPaymentForm(false);
      setNewPayment({
        invoiceId: '',
        jobId: '',
        paymentDate: new Date().toISOString().split('T')[0],
        amount: 0,
        method: 'Bank transfer',
        reference: '',
        receiptNumber: '',
        notes: '',
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Delete this payment record?')) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/accounts/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to delete');

      setSuccess('Payment deleted');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete payment');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCredit = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/accounts/credit-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newCredit),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to create credit note');
      }

      setSuccess('Credit note created successfully');
      setShowCreditForm(false);
      setNewCredit({
        invoiceId: '',
        amount: 0,
        reason: '',
        isRefund: false,
        creditDate: new Date().toISOString().split('T')[0],
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create credit note');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCredit = async (creditId: string) => {
    if (!confirm('Delete this credit note?')) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/accounts/credit-notes/${creditId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to delete');

      setSuccess('Credit note deleted');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete credit note');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertScheduleToInvoice = async (scheduleId: string, itemIndex: number) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/accounts/schedules/${scheduleId}/invoice/${itemIndex}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to convert to invoice');
      }

      setSuccess('Schedule item converted to invoice');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to convert to invoice');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getJobName = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    return job ? `${job.jobNumber} - ${job.projectName}` : jobId;
  };

  const getInvoiceName = (invoiceId: string) => {
    const invoice = invoices.find(i => i.id === invoiceId);
    return invoice ? `INV-${invoice.invoiceNumber}` : invoiceId;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-AU');
  };

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalScheduled = schedules.reduce((sum, s) => {
      return sum + (s.items || []).reduce((isum: number, i: any) => isum + (i.amount || 0), 0);
    }, 0);

    const totalReceived = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalOutstanding = receivables.reduce((sum, r) => sum + (r.outstanding || 0), 0);
    const totalCredits = creditNotes.reduce((sum, c) => sum + (c.amount || 0), 0);

    return {
      scheduled: totalScheduled,
      received: totalReceived,
      outstanding: totalOutstanding,
      credits: totalCredits,
    };
  }, [schedules, payments, receivables, creditNotes]);

  // Render tabs
  const SchedulesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">Payment Schedules</h3>
        <button
          onClick={() => setShowScheduleForm(!showScheduleForm)}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1"
        >
          <Plus size={14} /> New Schedule
        </button>
      </div>

      {showScheduleForm && (
        <div className="border border-gray-300 rounded p-4 bg-gray-50">
          <h4 className="font-semibold mb-3">Create Payment Schedule</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Job</label>
              <select
                value={newSchedule.jobId}
                onChange={(e) => setNewSchedule({ ...newSchedule, jobId: e.target.value })}
                className="w-full px-2 py-1 border rounded text-sm"
              >
                <option value="">Select job</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>
                    {getJobName(job.id)}
                  </option>
                ))}
              </select>
            </div>

            {newSchedule.items.map((item, idx) => (
              <div key={idx} className="border-t pt-2 space-y-2">
                <div className="text-xs font-semibold text-gray-600">Milestone {idx + 1}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium">Milestone</label>
                    <select
                      value={item.milestone}
                      onChange={(e) => {
                        const items = [...newSchedule.items];
                        items[idx].milestone = e.target.value;
                        setNewSchedule({ ...newSchedule, items });
                      }}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      <option>Deposit</option>
                      <option>Progress 1</option>
                      <option>Progress 2</option>
                      <option>Final</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">%</label>
                    <input
                      type="number"
                      value={item.percentage}
                      onChange={(e) => {
                        const items = [...newSchedule.items];
                        items[idx].percentage = parseFloat(e.target.value) || 0;
                        setNewSchedule({ ...newSchedule, items });
                      }}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium">Amount</label>
                  <input
                    type="number"
                    value={item.amount}
                    onChange={(e) => {
                      const items = [...newSchedule.items];
                      items[idx].amount = parseFloat(e.target.value) || 0;
                      setNewSchedule({ ...newSchedule, items });
                    }}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Due Date</label>
                  <input
                    type="date"
                    value={item.dueDate}
                    onChange={(e) => {
                      const items = [...newSchedule.items];
                      items[idx].dueDate = e.target.value;
                      setNewSchedule({ ...newSchedule, items });
                    }}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Notes</label>
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => {
                      const items = [...newSchedule.items];
                      items[idx].notes = e.target.value;
                      setNewSchedule({ ...newSchedule, items });
                    }}
                    placeholder="Optional"
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
            ))}

            <div className="flex gap-2 pt-3">
              <button
                onClick={() => {
                  const items = [...newSchedule.items, { milestone: 'Progress', percentage: 0, amount: 0, dueDate: '', notes: '' }];
                  setNewSchedule({ ...newSchedule, items });
                }}
                className="px-2 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
              >
                Add Milestone
              </button>
              <button
                onClick={handleCreateSchedule}
                disabled={loading || !newSchedule.jobId}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
              >
                Create Schedule
              </button>
              <button
                onClick={() => setShowScheduleForm(false)}
                className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {schedules.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No payment schedules</div>
        ) : (
          schedules.map(schedule => (
            <div key={schedule.id} className="border rounded p-3 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-sm">{getJobName(schedule.jobId)}</div>
                  <div className="text-xs text-gray-600">
                    {schedule.items?.length || 0} milestones • Total: {formatCurrency(
                      (schedule.items || []).reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setScheduleDetailId(scheduleDetailId === schedule.id ? '' : schedule.id)}
                  className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                >
                  {scheduleDetailId === schedule.id ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {scheduleDetailId === schedule.id && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  {schedule.items?.map((item: any, idx: number) => (
                    <div key={idx} className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="font-medium">{item.milestone}</span>
                        <span className="text-gray-600">{formatCurrency(item.amount || 0)}</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>{item.percentage}%</span>
                        <span>Due: {formatDate(item.dueDate)}</span>
                      </div>
                      {item.notes && <div className="text-gray-600 italic">{item.notes}</div>}
                      <button
                        onClick={() => handleConvertScheduleToInvoice(schedule.id, idx)}
                        disabled={loading || item.invoiced}
                        className="mt-1 px-2 py-0.5 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 disabled:bg-gray-400"
                      >
                        {item.invoiced ? 'Invoiced' : 'Convert to Invoice'}
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-2 border-t">
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      disabled={loading}
                      className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:bg-gray-400 flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  const PaymentsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">Recorded Payments</h3>
        <button
          onClick={() => setShowPaymentForm(!showPaymentForm)}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1"
        >
          <Plus size={14} /> Record Payment
        </button>
      </div>

      {showPaymentForm && (
        <div className="border border-gray-300 rounded p-4 bg-gray-50">
          <h4 className="font-semibold mb-3">Record Payment</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Invoice</label>
              <select
                value={newPayment.invoiceId}
                onChange={(e) => setNewPayment({ ...newPayment, invoiceId: e.target.value })}
                className="w-full px-2 py-1 border rounded text-sm"
              >
                <option value="">Select invoice</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {getInvoiceName(inv.id)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Payment Date</label>
              <input
                type="date"
                value={newPayment.paymentDate}
                onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Amount</label>
              <input
                type="number"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Method</label>
              <select
                value={newPayment.method}
                onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                className="w-full px-2 py-1 border rounded text-sm"
              >
                <option>Bank transfer</option>
                <option>Cash</option>
                <option>Card</option>
                <option>Cheque</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Reference</label>
              <input
                type="text"
                value={newPayment.reference}
                onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })}
                placeholder="e.g., reference number"
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Receipt #</label>
              <input
                type="text"
                value={newPayment.receiptNumber}
                onChange={(e) => setNewPayment({ ...newPayment, receiptNumber: e.target.value })}
                placeholder="Optional"
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                value={newPayment.notes}
                onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                placeholder="Optional"
                className="w-full px-2 py-1 border rounded text-sm"
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-3">
              <button
                onClick={handleCreatePayment}
                disabled={loading || !newPayment.invoiceId || newPayment.amount <= 0}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
              >
                Record Payment
              </button>
              <button
                onClick={() => setShowPaymentForm(false)}
                className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {payments.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No payments recorded</div>
        ) : (
          payments.map(payment => (
            <div key={payment.id} className="border rounded p-3 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-sm">{getInvoiceName(payment.invoiceId)}</div>
                  <div className="text-xs text-gray-600">
                    {formatCurrency(payment.amount)} via {payment.method} on {formatDate(payment.paymentDate)}
                  </div>
                </div>
                <button
                  onClick={() => setPaymentDetailId(paymentDetailId === payment.id ? '' : payment.id)}
                  className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                >
                  {paymentDetailId === payment.id ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {paymentDetailId === payment.id && (
                <div className="mt-3 space-y-1 border-t pt-3 text-xs">
                  {payment.reference && <div><span className="font-medium">Ref:</span> {payment.reference}</div>}
                  {payment.receiptNumber && <div><span className="font-medium">Receipt:</span> {payment.receiptNumber}</div>}
                  {payment.notes && <div><span className="font-medium">Notes:</span> {payment.notes}</div>}
                  <button
                    onClick={() => handleDeletePayment(payment.id)}
                    disabled={loading}
                    className="mt-2 px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:bg-gray-400 flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  const ReceivablesTab = () => (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg">Accounts Receivable</h3>
        <p className="text-xs text-gray-600 mt-1">Outstanding invoices and payment status</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="border rounded p-3 bg-blue-50">
          <div className="text-xs font-medium text-gray-600">Total Outstanding</div>
          <div className="text-lg font-semibold text-blue-700">{formatCurrency(kpis.outstanding)}</div>
        </div>
        <div className="border rounded p-3 bg-green-50">
          <div className="text-xs font-medium text-gray-600">Payments Received</div>
          <div className="text-lg font-semibold text-green-700">{formatCurrency(kpis.received)}</div>
        </div>
        <div className="border rounded p-3 bg-orange-50">
          <div className="text-xs font-medium text-gray-600">Scheduled</div>
          <div className="text-lg font-semibold text-orange-700">{formatCurrency(kpis.scheduled)}</div>
        </div>
        <div className="border rounded p-3 bg-red-50">
          <div className="text-xs font-medium text-gray-600">Credits Applied</div>
          <div className="text-lg font-semibold text-red-700">{formatCurrency(kpis.credits)}</div>
        </div>
      </div>

      <div className="space-y-2">
        {receivables.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No outstanding receivables</div>
        ) : (
          receivables.map((ar: any) => (
            <div key={ar.invoiceId} className="border rounded p-3 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-sm">{ar.invoiceNumber}</div>
                  <div className="text-xs text-gray-600">
                    {ar.client} • Total: {formatCurrency(ar.total || 0)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">{formatCurrency(ar.outstanding || 0)}</div>
                  <div className={`text-xs font-medium ${
                    ar.outstanding <= 0 ? 'text-green-600' : ar.daysOverdue > 0 ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    {ar.outstanding <= 0 ? 'Paid' : ar.daysOverdue > 0 ? `${ar.daysOverdue}d overdue` : 'Not yet due'}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Due: {formatDate(ar.dueDate)}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const CreditsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">Credit Notes</h3>
        <button
          onClick={() => setShowCreditForm(!showCreditForm)}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1"
        >
          <Plus size={14} /> New Credit
        </button>
      </div>

      {showCreditForm && (
        <div className="border border-gray-300 rounded p-4 bg-gray-50">
          <h4 className="font-semibold mb-3">Create Credit Note</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Invoice</label>
              <select
                value={newCredit.invoiceId}
                onChange={(e) => setNewCredit({ ...newCredit, invoiceId: e.target.value })}
                className="w-full px-2 py-1 border rounded text-sm"
              >
                <option value="">Select invoice</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {getInvoiceName(inv.id)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Amount</label>
              <input
                type="number"
                value={newCredit.amount}
                onChange={(e) => setNewCredit({ ...newCredit, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Reason</label>
              <textarea
                value={newCredit.reason}
                onChange={(e) => setNewCredit({ ...newCredit, reason: e.target.value })}
                placeholder="e.g., Return, discount, damage"
                className="w-full px-2 py-1 border rounded text-sm"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newCredit.isRefund}
                onChange={(e) => setNewCredit({ ...newCredit, isRefund: e.target.checked })}
                id="refund"
              />
              <label htmlFor="refund" className="text-sm">
                Actual refund (money returned to customer)
              </label>
            </div>

            <div>
              <label className="text-sm font-medium">Credit Date</label>
              <input
                type="date"
                value={newCredit.creditDate}
                onChange={(e) => setNewCredit({ ...newCredit, creditDate: e.target.value })}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>

            <div className="flex gap-2 pt-3">
              <button
                onClick={handleCreateCredit}
                disabled={loading || !newCredit.invoiceId || newCredit.amount <= 0 || !newCredit.reason}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
              >
                Create Credit
              </button>
              <button
                onClick={() => setShowCreditForm(false)}
                className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {creditNotes.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No credit notes</div>
        ) : (
          creditNotes.map(credit => (
            <div key={credit.id} className="border rounded p-3 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-sm">
                    Credit #{credit.creditNumber} for {getInvoiceName(credit.invoiceId)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{credit.reason}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm text-red-600">{formatCurrency(credit.amount)}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {credit.isRefund ? 'Refunded' : 'Credit note'} • {formatDate(credit.creditDate)}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex gap-2 border-t pt-2">
                <button
                  onClick={() => handleDeleteCredit(credit.id)}
                  disabled={loading}
                  className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:bg-gray-400 flex items-center gap-1"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Accounts</h1>
        <p className="text-xs text-gray-600 mt-1">Manage payments, receivables, and credit notes</p>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
          {success}
        </div>
      )}

      {loading && (
        <div className="text-center text-gray-500 text-sm">Loading...</div>
      )}

      {/* Tab navigation */}
      <div className="flex border-b">
        {[
          { id: 'schedules', label: 'Schedules', icon: Calendar },
          { id: 'payments', label: 'Payments', icon: DollarSign },
          { id: 'receivables', label: 'Receivables', icon: TrendingUp },
          { id: 'credits', label: 'Credits', icon: AlertCircle },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium text-sm border-b-2 flex items-center gap-1 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {activeTab === 'schedules' && <SchedulesTab />}
        {activeTab === 'payments' && <PaymentsTab />}
        {activeTab === 'receivables' && <ReceivablesTab />}
        {activeTab === 'credits' && <CreditsTab />}
      </div>
    </div>
  );
};

export default AccountsPage;
