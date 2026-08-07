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
  status: string;
  createdAt: string;
}

export default function InvoicesPage() {
  const [tab, setTab] = useState<"quotes" | "invoices" | "payments">("invoices");
  const [quotes, setQuotes] = useState<QuoteOrInvoice[]>([]);
  const [invoices, setInvoices] = useState<QuoteOrInvoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [client, setClient] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, rate: 0 }]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

              <button
                onClick={handleSave}
                className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Save {tab === "quotes" ? "Quote" : "Invoice"}
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
                <div key={doc.id} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900">{doc.client}</span>
                    <span className="font-semibold text-gray-900">${doc.total.toLocaleString()}</span>
                  </div>
                  <span className="inline-block text-xs bg-gray-100 px-2 py-1 rounded">{doc.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "payments" && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-gray-600">
          <p>💳 Payment recording ties into Invoices — open an invoice and mark it Paid.</p>
        </div>
      )}
    </div>
  );
}
