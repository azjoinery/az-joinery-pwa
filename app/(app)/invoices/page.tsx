"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
}

interface QuoteOrInvoice {
  id: string;
  client: string;
  lineItems: LineItem[];
  total: number;
  amountPaid?: number;
  outstanding?: number;
  status: string;
  createdAt: string;
}

interface Payment {
  id: string;
  invoiceId: string;
  paymentDate: string;
  amount: number;
  method: string;
  reference: string;
}

export default function InvoicesPage() {
  const [tab, setTab] = useState<"quotes" | "invoices" | "payments">("invoices");
  const [quotes, setQuotes] = useState<QuoteOrInvoice[]>([]);
  const [invoices, setInvoices] = useState<QuoteOrInvoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [client, setClient] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, rate: 0 }]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<QuoteOrInvoice | null>(null);

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    try {
      if (tab === "quotes") {
        const data = await api.get<QuoteOrInvoice[]>("/sales/quotes");
        setQuotes(data || []);
      } else if (tab === "invoices") {
        const data = await api.get<QuoteOrInvoice[]>("/accounts/invoices");
        setInvoices(data || []);
      } else if (tab === "payments") {
        const data = await api.get<Payment[]>("/accounts/payments");
        setPayments(data || []);
      }
    } catch (err) {
      // no data yet
    }
  };

  const addLineItem = () => setItems([...items, { description: "", quantity: 1, rate: 0 }]);

  const updateLineItem = (i: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
  };

  const removeLineItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const total = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const gst = total * 0.1;
  const totalWithGst = total + gst;

  const handleSave = async () => {
    if (!client.trim()) return;
    const payload = { client, lineItems: items, subtotal: total, gst, total: totalWithGst, status: "Draft" };
    const endpoint = tab === "quotes" ? "/sales/quotes" : "/accounts/invoices";
    setSaving(true);
    setSaveError(null);
    try {
      await api.post(endpoint, payload);
      resetForm();
      loadData();
    } catch (err) {
      setSaveError(
        `Couldn't save this ${tab === "quotes" ? "quote" : "invoice"} — it was not recorded. Check your connection and try again.`
      );
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setClient("");
    setItems([{ description: "", quantity: 1, rate: 0 }]);
    setShowForm(false);
    setSaveError(null);
  };

  const list = tab === "quotes" ? quotes : invoices;
  const revenue = invoices.reduce((sum, i) => sum + i.total, 0);
  const outstanding = invoices.filter((i) => i.status !== "Paid").reduce((sum, i) => sum + i.total, 0);

  if (selectedDoc) {
    return (
      <InvoiceDetail
        doc={selectedDoc}
        isInvoice={tab === "invoices"}
        onBack={() => setSelectedDoc(null)}
        onUpdated={(updated) => {
          if (tab === "invoices") {
            setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
          } else {
            setQuotes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
          }
          setSelectedDoc(updated);
        }}
      />
    );
  }

  return (
    <div className="p-4 pb-28 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">💰 Invoicing & Quotes</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600">Total Revenue</div>
          <div className="text-2xl font-bold text-green-900">${revenue.toLocaleString()}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="text-sm text-red-600">Outstanding</div>
          <div className="text-2xl font-bold text-red-900">${outstanding.toLocaleString()}</div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => { setTab("quotes"); setShowForm(false); }}
          className={`px-4 py-2 font-medium ${tab === "quotes" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-600"}`}
        >
          Quotes
        </button>
        <button
          onClick={() => { setTab("invoices"); setShowForm(false); }}
          className={`px-4 py-2 font-medium ${tab === "invoices" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-600"}`}
        >
          Invoices
        </button>
        <button
          onClick={() => { setTab("payments"); setShowForm(false); }}
          className={`px-4 py-2 font-medium ${tab === "payments" ? "text-orange-600 border-b-2 border-orange-600" : "text-gray-600"}`}
        >
          Payments
        </button>
      </div>

      {(tab === "quotes" || tab === "invoices") && (
        <div className="space-y-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600"
          >
            + New {tab === "quotes" ? "Quote" : "Invoice"}
          </button>

          {showForm && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
              <input
                type="text"
                placeholder="Client name"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />

              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(i, "description", e.target.value)}
                      className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(i, "quantity", parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Rate"
                      value={item.rate}
                      onChange={(e) => updateLineItem(i, "rate", parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button onClick={() => removeLineItem(i)} className="text-red-500 px-2">✕</button>
                  </div>
                ))}
              </div>

              <button onClick={addLineItem} className="text-sm text-orange-600 font-medium">
                + Add line item
              </button>

              <div className="border-t border-gray-200 pt-2 text-sm space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST (10%)</span>
                  <span>${gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900">
                  <span>Total</span>
                  <span>${totalWithGst.toFixed(2)}</span>
                </div>
              </div>

              {saveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{saveError}</div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : `Save ${tab === "quotes" ? "Quote" : "Invoice"}`}
              </button>
            </div>
          )}

          {list.length === 0 ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-gray-600">
              No {tab} yet
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="w-full text-left bg-white p-4 rounded-lg border border-gray-200 hover:border-orange-300"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900">{doc.client}</span>
                    <span className="font-semibold text-gray-900">${doc.total.toLocaleString()}</span>
                  </div>
                  <span className="inline-block text-xs bg-gray-100 px-2 py-1 rounded">{doc.status}</span>
                  {tab === "invoices" && doc.outstanding != null && doc.outstanding > 0 && (
                    <span className="inline-block text-xs bg-red-100 text-red-700 px-2 py-1 rounded ml-2">
                      ${doc.outstanding.toLocaleString()} owing
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "payments" && (
        <div className="space-y-2">
          {payments.length === 0 ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-gray-600">
              <p className="mb-1">No payments recorded yet</p>
              <p className="text-sm text-gray-400">Open an invoice and use "Record Payment" to mark it paid.</p>
            </div>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="bg-white p-4 rounded-lg border border-gray-200 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-900">{p.paymentDate} · {p.method}</p>
                  {p.reference && <p className="text-xs text-gray-500">Ref: {p.reference}</p>}
                </div>
                <span className="font-semibold text-green-700">${p.amount.toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function InvoiceDetail({
  doc,
  isInvoice,
  onBack,
  onUpdated,
}: {
  doc: QuoteOrInvoice;
  isInvoice: boolean;
  onBack: () => void;
  onUpdated: (doc: QuoteOrInvoice) => void;
}) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [amount, setAmount] = useState(doc.outstanding ?? doc.total);
  const [method, setMethod] = useState("Bank transfer");
  const [reference, setReference] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const recordPayment = async () => {
    if (amount <= 0) return;
    setPaying(true);
    setPayError(null);
    try {
      await api.post("/accounts/payments", {
        invoiceId: doc.id,
        paymentDate: new Date().toISOString().slice(0, 10),
        amount,
        method,
        reference,
      });
      // Re-fetch this invoice's updated status/outstanding rather than
      // guessing the math client-side.
      const refreshed = await api.get<QuoteOrInvoice[]>("/accounts/invoices");
      const match = refreshed.find((i) => i.id === doc.id);
      if (match) onUpdated(match);
      setShowPaymentForm(false);
    } catch (err) {
      setPayError("Couldn't record this payment — it was not saved. Check your connection and try again.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="p-4 pb-28">
      <button onClick={onBack} className="text-orange-600 font-medium mb-4 hover:underline">
        ← Back
      </button>

      <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{doc.client}</h1>
            <span className="inline-block mt-1 text-xs bg-gray-100 px-2 py-1 rounded">{doc.status}</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">${doc.total.toLocaleString()}</span>
        </div>

        {isInvoice && (
          <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-100 pt-4">
            <div>
              <div className="text-gray-500">Paid</div>
              <div className="font-semibold text-green-700">${(doc.amountPaid ?? 0).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-500">Outstanding</div>
              <div className="font-semibold text-red-700">${(doc.outstanding ?? doc.total).toLocaleString()}</div>
            </div>
          </div>
        )}

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Line Items</h3>
          <div className="space-y-1">
            {(doc.lineItems || []).map((item, i) => (
              <div key={i} className="flex justify-between text-sm text-gray-700 py-1 border-b border-gray-100 last:border-0">
                <span>{item.description} × {item.quantity}</span>
                <span>${(item.quantity * item.rate).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {isInvoice && (doc.outstanding == null || doc.outstanding > 0) && (
          <div className="border-t border-gray-100 pt-4">
            {!showPaymentForm ? (
              <button
                onClick={() => setShowPaymentForm(true)}
                className="w-full py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600"
              >
                Record Payment
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Amount ($)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option>Bank transfer</option>
                    <option>Credit card</option>
                    <option>Cash</option>
                    <option>Cheque</option>
                    <option>Direct debit</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Reference (optional)"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                {payError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{payError}</div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowPaymentForm(false); setPayError(null); }}
                    className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={recordPayment}
                    disabled={paying}
                    className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
                  >
                    {paying ? "Recording..." : "Confirm Payment"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
