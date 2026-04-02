import Head from "next/head";
import { useState } from "react";
import { useLocalStorage } from "../lib/useLocalStorage";

// ─── Sample Data ──────────────────────────────────────────────────────────────
const initialInventory = [
  { id: 1, fruit: "Mango",  qty: 500, unit: "kg", costPrice: 45,  sellingPrice: 65  },
  { id: 2, fruit: "Banana", qty: 300, unit: "kg", costPrice: 18,  sellingPrice: 30  },
  { id: 3, fruit: "Apple",  qty: 200, unit: "kg", costPrice: 90,  sellingPrice: 130 },
  { id: 4, fruit: "Orange", qty: 150, unit: "kg", costPrice: 35,  sellingPrice: 55  },
];

const initialTransactions = [
  { id: 1, type: "IN",  fruit: "Mango",  qty: 200, price: 45, date: "2026-03-28", total: 9000, note: "",             collector: "Juan dela Cruz", origin: "Guimaras", deliveredBy: "Pedro Reyes", supplier: "Santos Farm",    consumer: "" },
  { id: 2, type: "OUT", fruit: "Banana", qty: 50,  price: 30, date: "2026-03-29", total: 1500, note: "Regular order", collector: "Maria Santos",   origin: "Davao",    deliveredBy: "Tony Lim",    supplier: "Benguet Farm",   consumer: "Market Stall A" },
  { id: 3, type: "IN",  fruit: "Apple",  qty: 100, price: 90, date: "2026-03-30", total: 9000, note: "Fresh batch",   collector: "Ben Ramos",      origin: "Benguet",  deliveredBy: "Alex Cruz",   supplier: "Benguet Traders",consumer: "" },
  { id: 4, type: "OUT", fruit: "Mango",  qty: 80,  price: 65, date: "2026-04-01", total: 5200, note: "",             collector: "Juan dela Cruz", origin: "Guimaras", deliveredBy: "Pedro Reyes", supplier: "Santos Farm",    consumer: "Grocery Plus" },
];

const TABS = ["Dashboard", "Inventory", "Stock IN", "Stock OUT", "Transactions", "Reports"];
const TAB_ICONS = { Dashboard:"▦", Inventory:"☰", "Stock IN":"↓", "Stock OUT":"↑", Transactions:"⇄", Reports:"◈" };

function fmt(n)      { return n != null && n !== "" ? Number(n).toLocaleString("en-PH") : "—"; }
function fmtPrice(n) { return n != null && n !== "" && !isNaN(n) && Number(n) > 0 ? `₱${fmt(n)}` : "—"; }
function fruitEmoji(f = "") {
  const map = { Apple:"🍎",Banana:"🍌",Mango:"🥭",Orange:"🍊",Grapes:"🍇",Watermelon:"🍉",Pineapple:"🍍",Papaya:"🍈",Lemon:"🍋",Strawberry:"🍓",Avocado:"🥑",Melon:"🍈",Guava:"🍐",Lychee:"🍒",Jackfruit:"🫘" };
  return map[f] || "🍑";
}

function Badge({ type }) {
  return (
    <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700, letterSpacing:1, background:type==="IN"?"#d4f5e2":"#ffe4d4", color:type==="IN"?"#1a8048":"#c84b00", border:`1px solid ${type==="IN"?"#82dbb0":"#f4a97a"}` }}>{type}</span>
  );
}

const emptyIn  = () => ({ fruit:"", qty:"", price:"", supplier:"", collector:"", origin:"", deliveredBy:"", note:"", date: new Date().toISOString().slice(0,10) });
const emptyOut = () => ({ fruit:"", qty:"", price:"", consumer:"", collector:"", origin:"", deliveredBy:"", note:"", date: new Date().toISOString().slice(0,10) });
const emptyFilters = () => ({ search:"", type:"", fruit:"", dateFrom:"", dateTo:"", deliveredBy:"", supplier:"", consumer:"" });

// ─── Shared Styles ────────────────────────────────────────────────────────────
const fRow   = { display:"flex", flexDirection:"column", gap:5 };
const fLabel = { fontSize:11, fontWeight:700, color:"#3a5a3a", letterSpacing:0.5, textTransform:"uppercase" };
const fInput = { padding:"10px 13px", borderRadius:8, border:"1.5px solid #c8ddc8", fontSize:14, background:"#fafff8", outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"'Georgia',serif" };
const fHint  = { fontSize:11, color:"#aaa", marginTop:2 };
const card   = { background:"#fff", borderRadius:14, padding:24, boxShadow:"0 2px 14px #0001" };
const TH     = { textAlign:"left", padding:"9px 11px", color:"#556655", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:0.5, borderBottom:"2px solid #e4eee4", whiteSpace:"nowrap" };
const TD     = { padding:"9px 11px", borderBottom:"1px solid #f0f0f0", fontSize:13, verticalAlign:"middle" };
const btnSm  = { padding:"5px 13px", borderRadius:6, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'Georgia',serif" };
const fInputStyle = { padding:"4px 8px", borderRadius:6, border:"1.5px solid #c8e0c8", fontSize:13, background:"#f5fff5", fontFamily:"'Georgia',serif" };

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]                   = useState("Dashboard");
  const [inventory,   setInventory,   invLoaded]  = useLocalStorage("ft_inventory",    initialInventory);
  const [transactions, setTx,         txLoaded]   = useLocalStorage("ft_transactions", initialTransactions);
  const [txNextId,    setTxNextId,    ]            = useLocalStorage("ft_txNextId",     5);
  const [invNextId,   setInvNextId,   ]            = useLocalStorage("ft_invNextId",    5);
  const [toast,       setToast]         = useState(null);
  const [deleteModal, setDeleteModal]   = useState(null);
  const [editRow,     setEditRow]       = useState(null);
  const [inForm,      setInForm]        = useState(emptyIn());
  const [outForm,     setOutForm]       = useState(emptyOut());
  const [filters,     setFilters]       = useState(emptyFilters());
  const [showFilters, setShowFilters]   = useState(false);

  // Wait for localStorage to load before rendering data
  const isReady = invLoaded && txLoaded;

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  // ── Stock IN ──────────────────────────────────────────────────────────────
  function handleStockIn(e) {
    e.preventDefault();
    const qty = parseFloat(inForm.qty);
    if (!inForm.fruit.trim() || !(qty > 0)) return showToast("Fruit name and quantity are required.", "error");
    const price = inForm.price !== "" ? parseFloat(inForm.price) : null;
    const total = price != null ? qty * price : null;
    const fruitName = inForm.fruit.trim();

    const idx = inventory.findIndex(i => i.fruit.toLowerCase() === fruitName.toLowerCase());
    let newInv = [...inventory];
    if (idx >= 0) {
      newInv[idx] = { ...newInv[idx], qty: newInv[idx].qty + qty, ...(price != null ? { costPrice: price } : {}) };
    } else {
      newInv.push({ id: invNextId, fruit: fruitName, qty, unit:"kg", costPrice: price ?? 0, sellingPrice: price ? Math.round(price * 1.4) : 0 });
      setInvNextId(n => n + 1);
    }
    setInventory(newInv);
    setTx(t => [{ id: txNextId, type:"IN", fruit: fruitName, qty, price, date: inForm.date, total, supplier: inForm.supplier, collector: inForm.collector, origin: inForm.origin, deliveredBy: inForm.deliveredBy, consumer:"", note: inForm.note }, ...t]);
    setTxNextId(n => n + 1);
    setInForm(emptyIn());
    showToast(`✓ Stock IN: ${qty} kg of ${fruitName}`);
  }

  // ── Stock OUT ─────────────────────────────────────────────────────────────
  function handleStockOut(e) {
    e.preventDefault();
    const qty = parseFloat(outForm.qty);
    if (!outForm.fruit.trim() || !(qty > 0)) return showToast("Fruit name and quantity are required.", "error");
    const price = outForm.price !== "" ? parseFloat(outForm.price) : null;
    const total = price != null ? qty * price : null;
    const fruitName = outForm.fruit.trim();

    const idx = inventory.findIndex(i => i.fruit.toLowerCase() === fruitName.toLowerCase());
    if (idx < 0 || inventory[idx].qty < qty) return showToast("Insufficient stock for this fruit!", "error");

    let newInv = [...inventory];
    newInv[idx] = { ...newInv[idx], qty: newInv[idx].qty - qty, ...(price != null ? { sellingPrice: price } : {}) };
    if (newInv[idx].qty === 0) newInv.splice(idx, 1);
    setInventory(newInv);
    setTx(t => [{ id: txNextId, type:"OUT", fruit: fruitName, qty, price, date: outForm.date, total, supplier:"", collector: outForm.collector, origin: outForm.origin, deliveredBy: outForm.deliveredBy, consumer: outForm.consumer, note: outForm.note }, ...t]);
    setTxNextId(n => n + 1);
    setOutForm(emptyOut());
    showToast(`✓ Stock OUT: ${qty} kg of ${fruitName}`);
  }

  function handleDeleteTx(id) { setTx(t => t.filter(x => x.id !== id)); setDeleteModal(null); showToast("Transaction deleted."); }
  function handleEditSave()   { setInventory(inv => inv.map(i => i.id === editRow.id ? editRow : i)); setEditRow(null); showToast("Inventory updated."); }

  // ── Filter logic ──────────────────────────────────────────────────────────
  const allFruits    = [...new Set(transactions.map(t => t.fruit))].sort();
  const allDelivered = [...new Set(transactions.map(t => t.deliveredBy).filter(Boolean))].sort();
  const allSuppliers = [...new Set(transactions.map(t => t.supplier).filter(Boolean))].sort();
  const allConsumers = [...new Set(transactions.map(t => t.consumer).filter(Boolean))].sort();

  const filteredTx = transactions.filter(tx => {
    const s = filters.search.toLowerCase();
    return (
      (!s || [tx.fruit, tx.supplier, tx.consumer, tx.deliveredBy, tx.collector, tx.origin].some(v => (v||"").toLowerCase().includes(s))) &&
      (!filters.type        || tx.type === filters.type) &&
      (!filters.fruit       || tx.fruit === filters.fruit) &&
      (!filters.dateFrom    || tx.date >= filters.dateFrom) &&
      (!filters.dateTo      || tx.date <= filters.dateTo) &&
      (!filters.deliveredBy || tx.deliveredBy === filters.deliveredBy) &&
      (!filters.supplier    || tx.supplier === filters.supplier) &&
      (!filters.consumer    || tx.consumer === filters.consumer)
    );
  });

  const activeFilterCount = Object.values(filters).filter(v => v !== "").length;

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalInvValue = inventory.reduce((a, b) => a + b.qty * (b.costPrice || 0), 0);
  const totalRevenue  = transactions.filter(t => t.type==="OUT" && t.total != null).reduce((a, b) => a + b.total, 0);
  const totalCost     = transactions.filter(t => t.type==="IN"  && t.total != null).reduce((a, b) => a + b.total, 0);
  const profit        = totalRevenue - totalCost;
  const lowStock      = inventory.filter(i => i.qty < 50);

  // ─── JSX ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>FreshTrack Wholesale | Fruit Dealer Management System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{ fontFamily:"'Georgia',serif", minHeight:"100vh", background:"#f4f0e8", color:"#2a1a06" }}>

        {/* ── Header ── */}
        <div style={{ background:"linear-gradient(135deg,#1a4a1a 0%,#2d7a2d 60%,#4caf50 100%)", padding:"0 28px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 24px #0004", position:"sticky", top:0, zIndex:100, minHeight:62 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:30 }}>🍉</span>
            <div>
              <div style={{ fontSize:18, fontWeight:700, color:"#fff", letterSpacing:1 }}>FreshTrack Wholesale</div>
              <div style={{ fontSize:10, color:"#b8f0b8", letterSpacing:2 }}>FRUIT DEALER MANAGEMENT SYSTEM</div>
            </div>
          </div>
          <div style={{ fontSize:12, color:"#c8f0c8" }}>
            {new Date().toLocaleDateString("en-PH", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
          </div>
        </div>

        {/* ── Nav ── */}
        <div style={{ background:"#fff", borderBottom:"2px solid #d4e8d4", display:"flex", padding:"0 20px", overflowX:"auto" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ border:"none", background:"none", padding:"13px 20px", fontSize:13, fontWeight:tab===t?700:400, color:tab===t?"#1a4a1a":"#666", borderBottom:tab===t?"3px solid #2d7a2d":"3px solid transparent", cursor:"pointer", whiteSpace:"nowrap", fontFamily:"'Georgia',serif", display:"flex", alignItems:"center", gap:6 }}>
              <span>{TAB_ICONS[t]}</span>{t}
            </button>
          ))}
        </div>

        {/* ── Toast ── */}
        {toast && (
          <div style={{ position:"fixed", bottom:28, right:28, zIndex:999, background:toast.type==="error"?"#c84b00":"#1a8048", color:"#fff", borderRadius:10, padding:"13px 26px", fontWeight:600, fontSize:14, boxShadow:"0 6px 30px #0004" }}>
            {toast.msg}
          </div>
        )}

        {/* ── Delete Modal ── */}
        {deleteModal && (
          <div style={{ position:"fixed", inset:0, background:"#0007", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ background:"#fff", borderRadius:14, padding:34, minWidth:300, boxShadow:"0 8px 40px #0005", textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Delete Transaction?</div>
              <div style={{ color:"#666", marginBottom:22, fontSize:13 }}>This cannot be undone.</div>
              <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                <button onClick={() => setDeleteModal(null)} style={{ ...btnSm, background:"#eee", padding:"9px 24px" }}>Cancel</button>
                <button onClick={() => handleDeleteTx(deleteModal)} style={{ ...btnSm, background:"#c84b00", color:"#fff", padding:"9px 24px" }}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Loading State ── */}
        {!isReady && (
          <div style={{ textAlign:"center", padding:80, color:"#888" }}>Loading data…</div>
        )}

        {isReady && (
          <div style={{ padding:"26px 28px", maxWidth:1300, margin:"0 auto" }}>

            {/* ════════════════ DASHBOARD ════════════════ */}
            {tab === "Dashboard" && (
              <div>
                <h2 style={{ fontSize:24, fontWeight:700, marginBottom:4, color:"#1a4a1a" }}>Dashboard</h2>
                <p style={{ color:"#777", marginBottom:22, fontSize:13 }}>Overview of your wholesale operations</p>

                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))", gap:15, marginBottom:26 }}>
                  {[
                    { label:"Inventory Value", val:`₱${fmt(totalInvValue)}`, icon:"📦", bg:"#e8f5e9" },
                    { label:"Total Revenue",   val:`₱${fmt(totalRevenue)}`,  icon:"💰", bg:"#e3f2fd" },
                    { label:"Total Cost",      val:`₱${fmt(totalCost)}`,     icon:"🧾", bg:"#fff3e0" },
                    { label:"Net Profit",      val:`₱${fmt(profit)}`,        icon:profit>=0?"📈":"📉", bg:profit>=0?"#d4f5e2":"#ffe4d4" },
                    { label:"Products",        val:inventory.length,         icon:"🍎", bg:"#f3e5f5" },
                    { label:"Transactions",    val:transactions.length,      icon:"📋", bg:"#fce4ec" },
                  ].map(k => (
                    <div key={k.label} style={{ background:k.bg, borderRadius:13, padding:"18px 20px", border:"1px solid #e0e0e0", boxShadow:"0 2px 10px #0001" }}>
                      <div style={{ fontSize:24, marginBottom:6 }}>{k.icon}</div>
                      <div style={{ fontSize:20, fontWeight:700 }}>{k.val}</div>
                      <div style={{ fontSize:11, color:"#666", marginTop:2 }}>{k.label}</div>
                    </div>
                  ))}
                </div>

                {lowStock.length > 0 && (
                  <div style={{ background:"#fff8e1", border:"1.5px solid #ffb300", borderRadius:12, padding:"13px 18px", marginBottom:22 }}>
                    <div style={{ fontWeight:700, color:"#b45309", marginBottom:8 }}>⚠ Low Stock Alert</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                      {lowStock.map(i => <span key={i.id} style={{ background:"#fff3e0", border:"1px solid #ffcc80", borderRadius:20, padding:"3px 13px", fontSize:12 }}>{i.fruit}: <b>{i.qty} {i.unit}</b></span>)}
                    </div>
                  </div>
                )}

                <div style={{ ...card, overflowX:"auto" }}>
                  <div style={{ fontWeight:700, fontSize:15, marginBottom:14, color:"#1a4a1a" }}>Recent Transactions</div>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                    <thead><tr style={{ background:"#f5fbf5" }}>
                      {["Date","Type","Fruit","Qty","Collector","Origin","Delivered By","Supplier","Consumer","Price/kg","Total"].map(h => <th key={h} style={TH}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {transactions.slice(0,6).map((tx,i) => (
                        <tr key={tx.id} style={{ background:i%2===0?"#fff":"#fafff8" }}>
                          <td style={TD}>{tx.date}</td>
                          <td style={TD}><Badge type={tx.type}/></td>
                          <td style={{ ...TD, fontWeight:700 }}>{fruitEmoji(tx.fruit)} {tx.fruit}</td>
                          <td style={TD}>{tx.qty} kg</td>
                          <td style={{ ...TD, color:"#555" }}>{tx.collector||"—"}</td>
                          <td style={{ ...TD, color:"#555" }}>{tx.origin||"—"}</td>
                          <td style={{ ...TD, color:"#555" }}>{tx.deliveredBy||"—"}</td>
                          <td style={{ ...TD, color:"#555" }}>{tx.type==="IN"?(tx.supplier||"—"):"—"}</td>
                          <td style={{ ...TD, color:"#555" }}>{tx.type==="OUT"?(tx.consumer||"—"):"—"}</td>
                          <td style={TD}>{fmtPrice(tx.price)}</td>
                          <td style={{ ...TD, fontWeight:700, color:tx.type==="IN"?"#c84b00":"#1a8048" }}>{fmtPrice(tx.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ════════════════ INVENTORY ════════════════ */}
            {tab === "Inventory" && (
              <div>
                <h2 style={{ fontSize:24, fontWeight:700, marginBottom:4, color:"#1a4a1a" }}>Inventory</h2>
                <p style={{ color:"#777", marginBottom:22, fontSize:13 }}>Current stock levels and pricing</p>

                {/* Edit Modal */}
                {editRow && (
                  <div style={{ position:"fixed", inset:0, background:"#0007", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ background:"#fff", borderRadius:14, padding:30, minWidth:340, boxShadow:"0 8px 40px #0005" }}>
                      <div style={{ fontSize:18, fontWeight:700, marginBottom:18 }}>Edit {editRow.fruit}</div>
                      {[
                        { label:"Quantity (kg)", key:"qty", type:"number" },
                        { label:"Cost Price / kg", key:"costPrice", type:"number" },
                        { label:"Selling Price / kg", key:"sellingPrice", type:"number" },
                      ].map(f => (
                        <div key={f.key} style={{ ...fRow, marginBottom:12 }}>
                          <label style={fLabel}>{f.label}</label>
                          <input type={f.type} value={editRow[f.key]} onChange={e => setEditRow({ ...editRow, [f.key]: parseFloat(e.target.value)||0 })} style={fInput}/>
                        </div>
                      ))}
                      <div style={{ display:"flex", gap:10, marginTop:8 }}>
                        <button onClick={() => setEditRow(null)} style={{ ...btnSm, background:"#eee", padding:"9px 22px" }}>Cancel</button>
                        <button onClick={handleEditSave} style={{ ...btnSm, background:"#1a8048", color:"#fff", padding:"9px 22px" }}>Save</button>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ ...card, overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr style={{ background:"#f5fbf5" }}>
                      {["Fruit","Qty","Unit","Cost Price","Selling Price","Margin","Actions"].map(h => <th key={h} style={TH}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {inventory.map((item, i) => {
                        const margin = item.costPrice > 0 ? (((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100).toFixed(1) : null;
                        return (
                          <tr key={item.id} style={{ background:i%2===0?"#fff":"#fafff8" }}>
                            <td style={{ ...TD, fontWeight:700 }}>{fruitEmoji(item.fruit)} {item.fruit}</td>
                            <td style={{ ...TD, color: item.qty < 50 ? "#c84b00":"inherit", fontWeight: item.qty < 50 ? 700 : 400 }}>{fmt(item.qty)} {item.qty < 50 ? "⚠":""}</td>
                            <td style={TD}>{item.unit}</td>
                            <td style={TD}>{fmtPrice(item.costPrice)}</td>
                            <td style={TD}>{fmtPrice(item.sellingPrice)}</td>
                            <td style={TD}>
                              {margin != null
                                ? <span style={{ background:+margin>20?"#d4f5e2":+margin>0?"#fff3e0":"#ffe4d4", color:+margin>20?"#1a8048":+margin>0?"#b45309":"#c84b00", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 }}>{margin}%</span>
                                : "—"
                              }
                            </td>
                            <td style={TD}>
                              <button onClick={() => setEditRow({...item})} style={{ ...btnSm, background:"#e8f5e9", color:"#1a8048" }}>Edit</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {inventory.length === 0 && <div style={{ textAlign:"center", color:"#aaa", padding:40 }}>No inventory yet. Add stock via Stock IN.</div>}
                </div>
              </div>
            )}

            {/* ════════════════ STOCK IN ════════════════ */}
            {tab === "Stock IN" && (
              <div style={{ maxWidth:680 }}>
                <h2 style={{ fontSize:24, fontWeight:700, marginBottom:4, color:"#1a4a1a" }}>Stock IN</h2>
                <p style={{ color:"#777", marginBottom:22, fontSize:13 }}>Record incoming fruit stock</p>

                <form onSubmit={handleStockIn} style={{ ...card, display:"flex", flexDirection:"column", gap:16 }}>

                  <div style={{ background:"#f0fff4", borderRadius:10, padding:"14px 16px", border:"1px dashed #82dbb0" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#1a8048", marginBottom:12, letterSpacing:0.8 }}>📦 STOCK DETAILS</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <div style={fRow}>
                        <label style={fLabel}>Fruit Name <span style={{ color:"#c84b00" }}>*</span></label>
                        <input list="fruit-list" value={inForm.fruit} onChange={e => setInForm({...inForm, fruit:e.target.value})} style={fInput} placeholder="e.g. Mango, Banana…" required/>
                        <datalist id="fruit-list">
                          {["Mango","Banana","Apple","Orange","Grapes","Watermelon","Pineapple","Papaya","Lemon","Strawberry","Avocado","Guava"].map(f => <option key={f} value={f}/>)}
                        </datalist>
                      </div>
                      <div style={fRow}>
                        <label style={fLabel}>Quantity (kg) <span style={{ color:"#c84b00" }}>*</span></label>
                        <input type="number" min="0.01" step="0.01" value={inForm.qty} onChange={e => setInForm({...inForm, qty:e.target.value})} style={fInput} placeholder="0" required/>
                      </div>
                    </div>
                  </div>

                  <div style={{ background:"#f0f8ff", borderRadius:10, padding:"14px 16px", border:"1px dashed #82b8db" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#1a5a8a", marginBottom:12, letterSpacing:0.8 }}>🏪 SUPPLIER INFO</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <div style={fRow}>
                        <label style={fLabel}>Supplier / Farm</label>
                        <input value={inForm.supplier} onChange={e => setInForm({...inForm, supplier:e.target.value})} style={fInput} placeholder="Farm or vendor name"/>
                      </div>
                      <div style={fRow}>
                        <label style={fLabel}>Origin / Province</label>
                        <input value={inForm.origin} onChange={e => setInForm({...inForm, origin:e.target.value})} style={fInput} placeholder="e.g. Benguet, Davao"/>
                      </div>
                    </div>
                  </div>

                  <div style={{ background:"#fff5f0", borderRadius:10, padding:"14px 16px", border:"1px dashed #f4a97a" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#c84b00", marginBottom:12, letterSpacing:0.8 }}>👥 PEOPLE INVOLVED</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <div style={fRow}>
                        <label style={fLabel}>Collector</label>
                        <input value={inForm.collector} onChange={e => setInForm({...inForm, collector:e.target.value})} style={fInput} placeholder="Who received this stock"/>
                      </div>
                      <div style={fRow}>
                        <label style={fLabel}>Delivered By</label>
                        <input value={inForm.deliveredBy} onChange={e => setInForm({...inForm, deliveredBy:e.target.value})} style={fInput} placeholder="Driver / courier name"/>
                      </div>
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                    <div style={fRow}>
                      <label style={fLabel}>Cost Price / kg <span style={{ fontWeight:400, color:"#bbb", textTransform:"none", fontSize:10 }}> — optional</span></label>
                      <input type="number" min="0" step="0.01" value={inForm.price} onChange={e => setInForm({...inForm, price:e.target.value})} style={fInput} placeholder="Leave blank if not yet settled"/>
                      <span style={fHint}>Can be filled in later</span>
                    </div>
                    <div style={fRow}>
                      <label style={fLabel}>Date</label>
                      <input type="date" value={inForm.date} onChange={e => setInForm({...inForm, date:e.target.value})} style={fInput}/>
                    </div>
                  </div>

                  <div style={fRow}>
                    <label style={fLabel}>Note</label>
                    <input value={inForm.note} onChange={e => setInForm({...inForm, note:e.target.value})} style={fInput} placeholder="Optional remarks"/>
                  </div>

                  {inForm.qty && inForm.price && parseFloat(inForm.qty) > 0 && parseFloat(inForm.price) > 0 && (
                    <div style={{ background:"#d4f5e2", borderRadius:9, padding:"11px 16px", fontWeight:700, color:"#1a4a1a", fontSize:14 }}>
                      Estimated Total Cost: ₱{fmt(parseFloat(inForm.qty) * parseFloat(inForm.price))}
                    </div>
                  )}

                  <button type="submit" style={{ background:"linear-gradient(135deg,#1a4a1a,#2d7a2d)", color:"#fff", border:"none", borderRadius:10, padding:"13px", fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"'Georgia',serif" }}>
                    ↓ Record Stock IN
                  </button>
                </form>
              </div>
            )}

            {/* ════════════════ STOCK OUT ════════════════ */}
            {tab === "Stock OUT" && (
              <div style={{ maxWidth:680 }}>
                <h2 style={{ fontSize:24, fontWeight:700, marginBottom:4, color:"#1a4a1a" }}>Stock OUT</h2>
                <p style={{ color:"#777", marginBottom:22, fontSize:13 }}>Record outgoing / sold stock</p>

                <form onSubmit={handleStockOut} style={{ ...card, display:"flex", flexDirection:"column", gap:16 }}>

                  <div style={{ background:"#fff8f0", borderRadius:10, padding:"14px 16px", border:"1px dashed #f4c97a" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#b45309", marginBottom:12, letterSpacing:0.8 }}>📤 SALE DETAILS</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <div style={fRow}>
                        <label style={fLabel}>Fruit Name <span style={{ color:"#c84b00" }}>*</span></label>
                        <select value={outForm.fruit} onChange={e => setOutForm({...outForm, fruit:e.target.value})} style={fInput} required>
                          <option value="">— Select fruit —</option>
                          {inventory.map(i => <option key={i.id} value={i.fruit}>{fruitEmoji(i.fruit)} {i.fruit} ({fmt(i.qty)} kg left)</option>)}
                        </select>
                      </div>
                      <div style={fRow}>
                        <label style={fLabel}>Quantity (kg) <span style={{ color:"#c84b00" }}>*</span></label>
                        <input type="number" min="0.01" step="0.01" value={outForm.qty} onChange={e => setOutForm({...outForm, qty:e.target.value})} style={fInput} placeholder="0" required/>
                        {outForm.fruit && outForm.qty && (() => { const inv = inventory.find(i => i.fruit === outForm.fruit); return inv && parseFloat(outForm.qty) > inv.qty ? <span style={{ color:"#c84b00", fontSize:11 }}>⚠ Exceeds stock ({inv.qty} kg)</span> : null; })()}
                      </div>
                    </div>
                  </div>

                  <div style={{ background:"#fff5f0", borderRadius:10, padding:"14px 16px", border:"1px dashed #f4a97a" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#c84b00", marginBottom:12, letterSpacing:0.8 }}>👥 PEOPLE INVOLVED</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <div style={fRow}>
                        <label style={fLabel}>Consumer / Buyer</label>
                        <input value={outForm.consumer} onChange={e => setOutForm({...outForm, consumer:e.target.value})} style={fInput} placeholder="Market stall, grocery, client…"/>
                      </div>
                      <div style={fRow}>
                        <label style={fLabel}>Collector</label>
                        <input value={outForm.collector} onChange={e => setOutForm({...outForm, collector:e.target.value})} style={fInput} placeholder="Who packed / pulled stock"/>
                      </div>
                      <div style={fRow}>
                        <label style={fLabel}>Delivered By</label>
                        <input value={outForm.deliveredBy} onChange={e => setOutForm({...outForm, deliveredBy:e.target.value})} style={fInput} placeholder="Driver / courier name"/>
                      </div>
                      <div style={fRow}>
                        <label style={fLabel}>Origin / Dispatch Point</label>
                        <input value={outForm.origin} onChange={e => setOutForm({...outForm, origin:e.target.value})} style={fInput} placeholder="Where it was dispatched from"/>
                      </div>
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                    <div style={fRow}>
                      <label style={fLabel}>Selling Price / kg <span style={{ fontWeight:400, color:"#bbb", textTransform:"none", fontSize:10 }}> — optional</span></label>
                      <input type="number" min="0" step="0.01" value={outForm.price} onChange={e => setOutForm({...outForm, price:e.target.value})} style={fInput} placeholder="Leave blank if not yet settled"/>
                      <span style={fHint}>Can be filled in later</span>
                    </div>
                    <div style={fRow}>
                      <label style={fLabel}>Date</label>
                      <input type="date" value={outForm.date} onChange={e => setOutForm({...outForm, date:e.target.value})} style={fInput}/>
                    </div>
                  </div>

                  <div style={fRow}>
                    <label style={fLabel}>Note</label>
                    <input value={outForm.note} onChange={e => setOutForm({...outForm, note:e.target.value})} style={fInput} placeholder="Optional remarks"/>
                  </div>

                  {outForm.qty && outForm.price && parseFloat(outForm.qty) > 0 && parseFloat(outForm.price) > 0 && (
                    <div style={{ background:"#d4f5e2", borderRadius:9, padding:"11px 16px", fontWeight:700, color:"#1a4a1a", fontSize:14 }}>
                      Estimated Total Revenue: ₱{fmt(parseFloat(outForm.qty) * parseFloat(outForm.price))}
                    </div>
                  )}

                  <button type="submit" style={{ background:"linear-gradient(135deg,#7a2d00,#c84b00)", color:"#fff", border:"none", borderRadius:10, padding:"13px", fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"'Georgia',serif" }}>
                    ↑ Record Stock OUT
                  </button>
                </form>
              </div>
            )}

            {/* ════════════════ TRANSACTIONS ════════════════ */}
            {tab === "Transactions" && (
              <div>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10, flexWrap:"wrap", gap:12 }}>
                  <div>
                    <h2 style={{ fontSize:24, fontWeight:700, color:"#1a4a1a", margin:0 }}>Transactions</h2>
                    <p style={{ color:"#777", fontSize:13, margin:"4px 0 0" }}>
                      Showing <b>{filteredTx.length}</b> of <b>{transactions.length}</b> records
                    </p>
                  </div>
                  <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                    <input value={filters.search} onChange={e => setFilters({...filters,search:e.target.value})} placeholder="🔍 Search anything…" style={{...fInput,width:230,padding:"9px 13px"}}/>
                    <button onClick={() => setShowFilters(v => !v)} style={{ ...btnSm, background:showFilters?"#1a4a1a":"#e8f5e9", color:showFilters?"#fff":"#1a4a1a", padding:"9px 18px", border:"1.5px solid #c8ddc8", display:"flex", alignItems:"center", gap:7, fontSize:13 }}>
                      ⚙ Filters {activeFilterCount > 0 && <span style={{ background:"#c84b00", color:"#fff", borderRadius:20, padding:"1px 8px", fontSize:11, fontWeight:700 }}>{activeFilterCount}</span>}
                    </button>
                    {activeFilterCount > 0 && (
                      <button onClick={() => setFilters(emptyFilters())} style={{...btnSm,background:"#ffe4d4",color:"#c84b00",padding:"9px 14px",fontSize:13}}>✕ Clear All</button>
                    )}
                  </div>
                </div>

                {showFilters && (
                  <div style={{ background:"#fff", borderRadius:12, padding:"18px 20px", border:"1.5px solid #c8ddc8", marginBottom:16, boxShadow:"0 2px 12px #0001" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#1a4a1a", marginBottom:14, letterSpacing:0.8 }}>FILTER OPTIONS</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))", gap:12 }}>
                      <div style={fRow}>
                        <label style={fLabel}>Type</label>
                        <select value={filters.type} onChange={e => setFilters({...filters,type:e.target.value})} style={fInput}>
                          <option value="">All Types</option>
                          <option value="IN">IN only</option>
                          <option value="OUT">OUT only</option>
                        </select>
                      </div>
                      <div style={fRow}>
                        <label style={fLabel}>Fruit</label>
                        <select value={filters.fruit} onChange={e => setFilters({...filters,fruit:e.target.value})} style={fInput}>
                          <option value="">All Fruits</option>
                          {allFruits.map(f => <option key={f}>{f}</option>)}
                        </select>
                      </div>
                      <div style={fRow}>
                        <label style={fLabel}>Date From</label>
                        <input type="date" value={filters.dateFrom} onChange={e => setFilters({...filters,dateFrom:e.target.value})} style={fInput}/>
                      </div>
                      <div style={fRow}>
                        <label style={fLabel}>Date To</label>
                        <input type="date" value={filters.dateTo} onChange={e => setFilters({...filters,dateTo:e.target.value})} style={fInput}/>
                      </div>
                      <div style={fRow}>
                        <label style={fLabel}>Delivered By</label>
                        <select value={filters.deliveredBy} onChange={e => setFilters({...filters,deliveredBy:e.target.value})} style={fInput}>
                          <option value="">All Couriers</option>
                          {allDelivered.map(d => <option key={d}>{d}</option>)}
                        </select>
                      </div>
                      <div style={fRow}>
                        <label style={fLabel}>Supplier (IN)</label>
                        <select value={filters.supplier} onChange={e => setFilters({...filters,supplier:e.target.value})} style={fInput}>
                          <option value="">All Suppliers</option>
                          {allSuppliers.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div style={fRow}>
                        <label style={fLabel}>Consumer (OUT)</label>
                        <select value={filters.consumer} onChange={e => setFilters({...filters,consumer:e.target.value})} style={fInput}>
                          <option value="">All Consumers</option>
                          {allConsumers.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ ...card, padding:0, overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                    <thead>
                      <tr style={{ background:"#f5fbf5" }}>
                        {["#","Date","Type","Fruit","Qty","Collector","Origin","Delivered By","Supplier","Consumer","Price/kg","Total","Note",""].map(h => <th key={h} style={TH}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTx.map((tx, i) => (
                        <tr key={tx.id} style={{ background:i%2===0?"#fff":"#fafff8" }}>
                          <td style={{...TD,color:"#bbb",fontSize:11}}>{i+1}</td>
                          <td style={{...TD,whiteSpace:"nowrap"}}>{tx.date}</td>
                          <td style={TD}><Badge type={tx.type}/></td>
                          <td style={{...TD,fontWeight:700,whiteSpace:"nowrap"}}>{fruitEmoji(tx.fruit)} {tx.fruit}</td>
                          <td style={{...TD,whiteSpace:"nowrap"}}>{tx.qty} kg</td>
                          <td style={{...TD,color:"#555"}}>{tx.collector||"—"}</td>
                          <td style={{...TD,color:"#555"}}>{tx.origin||"—"}</td>
                          <td style={{...TD,color:"#555"}}>{tx.deliveredBy||"—"}</td>
                          <td style={{...TD,color:"#555"}}>{tx.type==="IN"?(tx.supplier||"—"):"—"}</td>
                          <td style={{...TD,color:"#555"}}>{tx.type==="OUT"?(tx.consumer||"—"):"—"}</td>
                          <td style={TD}>{fmtPrice(tx.price)}</td>
                          <td style={{...TD,fontWeight:700,color:tx.type==="IN"?"#c84b00":"#1a8048",whiteSpace:"nowrap"}}>{fmtPrice(tx.total)}</td>
                          <td style={{...TD,color:"#999",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.note||"—"}</td>
                          <td style={TD}>
                            <button onClick={() => setDeleteModal(tx.id)} style={{...btnSm,background:"#ffe4d4",color:"#c84b00",padding:"3px 9px"}}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredTx.length === 0 && <div style={{ textAlign:"center", color:"#aaa", padding:40, fontSize:14 }}>No transactions match the current filters.</div>}
                </div>
              </div>
            )}

            {/* ════════════════ REPORTS ════════════════ */}
            {tab === "Reports" && (
              <div>
                <h2 style={{ fontSize:24, fontWeight:700, marginBottom:4, color:"#1a4a1a" }}>Reports & Analytics</h2>
                <p style={{ color:"#777", marginBottom:22, fontSize:13 }}>Financial summary and per-fruit breakdown</p>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:22 }}>
                  <div style={card}>
                    <div style={{ fontWeight:700, fontSize:15, marginBottom:14, color:"#1a4a1a" }}>💰 Financial Summary</div>
                    {[
                      { label:"Total Revenue (Sales)",   val:totalRevenue,  color:"#1a8048" },
                      { label:"Total Cost (Purchases)",  val:totalCost,     color:"#c84b00" },
                      { label:"Gross Profit",            val:profit,        color:profit>=0?"#1a8048":"#c84b00" },
                      { label:"Current Inventory Value", val:totalInvValue, color:"#1a4a1a" },
                    ].map(r => (
                      <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #f0f0f0" }}>
                        <span style={{ color:"#555", fontSize:13 }}>{r.label}</span>
                        <span style={{ fontWeight:700, color:r.color }}>₱{fmt(r.val)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={card}>
                    <div style={{ fontWeight:700, fontSize:15, marginBottom:14, color:"#1a4a1a" }}>📊 Volume Summary</div>
                    {[
                      { label:"Total Transactions", val:transactions.length },
                      { label:"Stock IN Events",    val:transactions.filter(t=>t.type==="IN").length },
                      { label:"Stock OUT Events",   val:transactions.filter(t=>t.type==="OUT").length },
                      { label:"Active Products",    val:inventory.length },
                      { label:"Unique Suppliers",   val:allSuppliers.length },
                      { label:"Unique Consumers",   val:allConsumers.length },
                      { label:"Unique Couriers",    val:allDelivered.length },
                    ].map(r => (
                      <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #f0f0f0" }}>
                        <span style={{ color:"#555", fontSize:13 }}>{r.label}</span>
                        <span style={{ fontWeight:700, color:"#1a4a1a" }}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ ...card, overflowX:"auto" }}>
                  <div style={{ fontWeight:700, fontSize:15, marginBottom:14, color:"#1a4a1a" }}>Per-Fruit Breakdown</div>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                    <thead><tr style={{ background:"#f5fbf5" }}>
                      {["Fruit","Qty Bought","Qty Sold","Revenue","Cost","Profit","Margin"].map(h => <th key={h} style={TH}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {[...new Set(transactions.map(t => t.fruit))].sort().map(f => {
                        const inTx  = transactions.filter(t => t.type==="IN"  && t.fruit===f);
                        const outTx = transactions.filter(t => t.type==="OUT" && t.fruit===f);
                        const cost  = inTx.filter(t => t.total!=null).reduce((a,b) => a+b.total, 0);
                        const rev   = outTx.filter(t => t.total!=null).reduce((a,b) => a+b.total, 0);
                        const qIn   = inTx.reduce((a,b) => a+b.qty, 0);
                        const qOut  = outTx.reduce((a,b) => a+b.qty, 0);
                        const gp    = rev - cost;
                        const margin= rev > 0 ? ((gp/rev)*100).toFixed(1) : null;
                        return (
                          <tr key={f}>
                            <td style={{...TD,fontWeight:700}}>{fruitEmoji(f)} {f}</td>
                            <td style={TD}>{fmt(qIn)} kg</td>
                            <td style={TD}>{fmt(qOut)} kg</td>
                            <td style={{...TD,color:"#1a8048",fontWeight:600}}>{rev?`₱${fmt(rev)}`:"—"}</td>
                            <td style={{...TD,color:"#c84b00",fontWeight:600}}>{cost?`₱${fmt(cost)}`:"—"}</td>
                            <td style={{...TD,fontWeight:700,color:gp>=0?"#1a8048":"#c84b00"}}>{(rev||cost)?`₱${fmt(gp)}`:"—"}</td>
                            <td style={TD}>{margin!=null
                              ? <span style={{ background:+margin>20?"#d4f5e2":+margin>0?"#fff3e0":"#ffe4d4", color:+margin>20?"#1a8048":+margin>0?"#b45309":"#c84b00", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 }}>{margin}%</span>
                              : "—"
                            }</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </>
  );
}
