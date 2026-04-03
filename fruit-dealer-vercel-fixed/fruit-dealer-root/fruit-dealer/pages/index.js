import Head from "next/head";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

// ─── Default Units ─────────────────────────────────────────────────────────────
const DEFAULT_UNITS = ["kg", "box", "pcs", "redbag", "sack", "crate", "tray", "bundle"];

const TABS = ["Dashboard", "Inventory", "Stock IN", "Stock OUT", "Transactions", "Reports"];
const TAB_ICONS = { Dashboard:"▦", Inventory:"☰", "Stock IN":"↓", "Stock OUT":"↑", Transactions:"⇄", Reports:"◈" };

function fmt(n)      { return n != null && n !== "" ? Number(n).toLocaleString("en-PH") : "—"; }
function fruitEmoji(f = "") {
  const map = { Apple:"🍎",Banana:"🍌",Mango:"🥭",Orange:"🍊",Grapes:"🍇",Watermelon:"🍉",Pineapple:"🍍",Papaya:"🍈",Lemon:"🍋",Strawberry:"🍓",Avocado:"🥑",Melon:"🍈",Guava:"🍐",Lychee:"🍒",Jackfruit:"🫘" };
  return map[f] || "🍑";
}

function Badge({ type }) {
  return (
    <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700, letterSpacing:1, background:type==="IN"?"#d4f5e2":"#ffe4d4", color:type==="IN"?"#1a8048":"#c84b00", border:`1px solid ${type==="IN"?"#82dbb0":"#f4a97a"}` }}>{type}</span>
  );
}

const emptyIn  = () => ({ fruit:"", qty:"", unit:"kg",  supplier:"", collector:"", deliveredBy:"", note:"", date: new Date().toISOString().slice(0,10) });
const emptyOut = () => ({ fruit:"", qty:"", unit:"kg",  consumer:"", collector:"", deliveredBy:"", vehicle:"", note:"", date: new Date().toISOString().slice(0,10) });
const emptyFilters = () => ({ search:"", type:"", fruit:"", dateFrom:"", dateTo:"", deliveredBy:"", supplier:"", consumer:"", vehicle:"" });

// ─── Shared Styles ────────────────────────────────────────────────────────────
const fRow   = { display:"flex", flexDirection:"column", gap:5 };
const fLabel = { fontSize:11, fontWeight:700, color:"#3a5a3a", letterSpacing:0.5, textTransform:"uppercase" };
const fInput = { padding:"10px 13px", borderRadius:8, border:"1.5px solid #c8ddc8", fontSize:14, background:"#fafff8", outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"'Georgia',serif" };
const fHint  = { fontSize:11, color:"#aaa", marginTop:2 };
const card   = { background:"#fff", borderRadius:14, padding:24, boxShadow:"0 2px 14px #0001" };
const TH     = { textAlign:"left", padding:"9px 11px", color:"#556655", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:0.5, borderBottom:"2px solid #e4eee4", whiteSpace:"nowrap" };
const TD     = { padding:"9px 11px", borderBottom:"1px solid #f0f0f0", fontSize:13, verticalAlign:"middle" };
const btnSm  = { padding:"5px 13px", borderRadius:6, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'Georgia',serif" };

// ─── Unit Selector Component ──────────────────────────────────────────────────
function UnitSelector({ value, onChange, customUnits }) {
  const allUnits = [...new Set([...DEFAULT_UNITS, ...customUnits])];
  const [showCustom, setShowCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
      {allUnits.map(u => (
        <button key={u} type="button" onClick={() => onChange(u)}
          style={{ padding:"5px 13px", borderRadius:20, border:`1.5px solid ${value===u?"#2d7a2d":"#c8ddc8"}`, background:value===u?"#2d7a2d":"#fff", color:value===u?"#fff":"#444", fontSize:12, fontWeight:value===u?700:400, cursor:"pointer", fontFamily:"'Georgia',serif" }}>
          {u}
        </button>
      ))}
      {showCustom ? (
        <div style={{ display:"flex", gap:4 }}>
          <input autoFocus value={customInput} onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => { if (e.key==="Enter" && customInput.trim()) { onChange(customInput.trim()); setShowCustom(false); setCustomInput(""); } }}
            placeholder="e.g. redbag" style={{ padding:"4px 8px", borderRadius:6, border:"1.5px solid #c8ddc8", fontSize:12, width:90, fontFamily:"'Georgia',serif" }}/>
          <button type="button" onClick={() => { if (customInput.trim()) { onChange(customInput.trim()); } setShowCustom(false); setCustomInput(""); }}
            style={{ ...btnSm, background:"#1a8048", color:"#fff", padding:"4px 10px" }}>+</button>
        </div>
      ) : (
        <button type="button" onClick={() => setShowCustom(true)}
          style={{ padding:"4px 10px", borderRadius:20, border:"1.5px dashed #aaa", background:"transparent", color:"#888", fontSize:11, cursor:"pointer", fontFamily:"'Georgia',serif" }}>
          + other
        </button>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]             = useState("Dashboard");
  const [inventory,   setInventory]  = useState([]);
  const [transactions, setTx]        = useState([]);
  const [customUnits, setCustomUnits] = useState([]);
  const [loading, setLoading]        = useState(true);
  const [syncing, setSyncing]        = useState(false);
  const [toast,        setToast]     = useState(null);
  const [deleteModal,  setDeleteModal]    = useState(null);
  const [deleteInvModal, setDeleteInvModal] = useState(null);
  const [editRow,      setEditRow]   = useState(null);
  const [inForm,       setInForm]    = useState(emptyIn());
  const [outForm,      setOutForm]   = useState(emptyOut());
  const [filters,      setFilters]   = useState(emptyFilters());
  const [showFilters,  setShowFilters] = useState(false);

  // ── Load data from Supabase ───────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: inv }, { data: txs }, { data: units }] = await Promise.all([
        supabase.from("inventory").select("*").order("fruit"),
        supabase.from("transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("settings").select("value").eq("key", "custom_units").single(),
      ]);
      if (inv)   setInventory(inv);
      if (txs)   setTx(txs);
      if (units?.value) setCustomUnits(JSON.parse(units.value));
    } catch (e) {
      showToast("Failed to load data from database.", "error");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Real-time subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    const invChannel = supabase
      .channel("inventory-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, () => {
        supabase.from("inventory").select("*").order("fruit").then(({ data }) => { if (data) setInventory(data); });
      })
      .subscribe();

    const txChannel = supabase
      .channel("tx-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        supabase.from("transactions").select("*").order("created_at", { ascending: false }).then(({ data }) => { if (data) setTx(data); });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(invChannel);
      supabase.removeChannel(txChannel);
    };
  }, []);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  async function saveCustomUnit(unit) {
    if (!DEFAULT_UNITS.includes(unit) && !customUnits.includes(unit)) {
      const next = [...customUnits, unit];
      setCustomUnits(next);
      await supabase.from("settings").upsert({ key: "custom_units", value: JSON.stringify(next) });
    }
  }

  // ── Stock IN ──────────────────────────────────────────────────────────────
  async function handleStockIn(e) {
    e.preventDefault();
    const qty = parseFloat(inForm.qty);
    if (!inForm.fruit.trim() || !(qty > 0)) return showToast("Fruit name and quantity are required.", "error");
    const fruitName = inForm.fruit.trim();
    const unit = inForm.unit || "kg";
    setSyncing(true);
    await saveCustomUnit(unit);

    try {
      // Upsert inventory
      const existing = inventory.find(i => i.fruit.toLowerCase() === fruitName.toLowerCase());
      if (existing) {
        const { error } = await supabase.from("inventory").update({ qty: existing.qty + qty, unit }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventory").insert({ fruit: fruitName, qty, unit });
        if (error) throw error;
      }
      // Insert transaction
      const { error: txErr } = await supabase.from("transactions").insert({
        type: "IN", fruit: fruitName, qty, unit, date: inForm.date,
        supplier: inForm.supplier, collector: inForm.collector,
        delivered_by: inForm.deliveredBy, vehicle: "", consumer: "", note: inForm.note,
      });
      if (txErr) throw txErr;
      setInForm(emptyIn());
      showToast(`✓ Stock IN: ${qty} ${unit} of ${fruitName}`);
    } catch (err) {
      showToast("Error saving Stock IN: " + err.message, "error");
    }
    setSyncing(false);
  }

  // ── Stock OUT ─────────────────────────────────────────────────────────────
  async function handleStockOut(e) {
    e.preventDefault();
    const qty = parseFloat(outForm.qty);
    if (!outForm.fruit.trim() || !(qty > 0)) return showToast("Fruit name and quantity are required.", "error");
    const fruitName = outForm.fruit.trim();
    const unit = outForm.unit || "kg";

    const inv = inventory.find(i => i.fruit.toLowerCase() === fruitName.toLowerCase());
    if (!inv || inv.qty < qty) return showToast("Insufficient stock for this fruit!", "error");

    setSyncing(true);
    try {
      const newQty = inv.qty - qty;
      if (newQty === 0) {
        await supabase.from("inventory").delete().eq("id", inv.id);
      } else {
        await supabase.from("inventory").update({ qty: newQty }).eq("id", inv.id);
      }
      const { error } = await supabase.from("transactions").insert({
        type: "OUT", fruit: fruitName, qty, unit, date: outForm.date,
        supplier: "", collector: outForm.collector,
        delivered_by: outForm.deliveredBy, vehicle: outForm.vehicle,
        consumer: outForm.consumer, note: outForm.note,
      });
      if (error) throw error;
      setOutForm(emptyOut());
      showToast(`✓ Stock OUT: ${qty} ${unit} of ${fruitName}`);
    } catch (err) {
      showToast("Error saving Stock OUT: " + err.message, "error");
    }
    setSyncing(false);
  }

  async function handleDeleteTx(id) {
    await supabase.from("transactions").delete().eq("id", id);
    setDeleteModal(null);
    showToast("Transaction deleted.");
  }

  async function handleDeleteInv(id) {
    await supabase.from("inventory").delete().eq("id", id);
    setDeleteInvModal(null);
    showToast("Item removed from inventory.");
  }

  async function handleEditSave() {
    const { error } = await supabase.from("inventory").update({ qty: editRow.qty, unit: editRow.unit }).eq("id", editRow.id);
    if (error) return showToast("Error updating inventory.", "error");
    setEditRow(null);
    showToast("Inventory updated.");
  }

  // ── Filter logic ──────────────────────────────────────────────────────────
  // Map DB column delivered_by → deliveredBy for display compatibility
  const txDisplay = transactions.map(t => ({ ...t, deliveredBy: t.delivered_by }));

  const allFruits    = [...new Set(txDisplay.map(t => t.fruit))].sort();
  const allDelivered = [...new Set(txDisplay.map(t => t.deliveredBy).filter(Boolean))].sort();
  const allSuppliers = [...new Set(txDisplay.map(t => t.supplier).filter(Boolean))].sort();
  const allConsumers = [...new Set(txDisplay.map(t => t.consumer).filter(Boolean))].sort();
  const allVehicles  = [...new Set(txDisplay.map(t => t.vehicle).filter(Boolean))].sort();

  const filteredTx = txDisplay.filter(tx => {
    const s = filters.search.toLowerCase();
    return (
      (!s || [tx.fruit, tx.supplier, tx.consumer, tx.deliveredBy, tx.collector, tx.vehicle].some(v => (v||"").toLowerCase().includes(s))) &&
      (!filters.type        || tx.type === filters.type) &&
      (!filters.fruit       || tx.fruit === filters.fruit) &&
      (!filters.dateFrom    || tx.date >= filters.dateFrom) &&
      (!filters.dateTo      || tx.date <= filters.dateTo) &&
      (!filters.deliveredBy || tx.deliveredBy === filters.deliveredBy) &&
      (!filters.supplier    || tx.supplier === filters.supplier) &&
      (!filters.consumer    || tx.consumer === filters.consumer) &&
      (!filters.vehicle     || tx.vehicle === filters.vehicle)
    );
  });

  const activeFilterCount = Object.values(filters).filter(v => v !== "").length;
  const lowStock = inventory.filter(i => i.qty < 50);

  // ─── JSX ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Orangs Wholesale Fruit Dealers</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ fontFamily:"'Georgia',serif", minHeight:"100vh", background:"#f4f0e8", color:"#2a1a06" }}>

        {/* ── Header ── */}
        <div style={{ background:"linear-gradient(135deg,#1a4a1a 0%,#2d7a2d 60%,#4caf50 100%)", padding:"0 28px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 24px #0004", position:"sticky", top:0, zIndex:100, minHeight:62 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:30 }}>🍊</span>
            <div>
              <div style={{ fontSize:18, fontWeight:700, color:"#fff", letterSpacing:1 }}>Orangs Wholesale Fruit Dealers</div>
              <div style={{ fontSize:10, color:"#b8f0b8", letterSpacing:2 }}>FRUIT DEALER MANAGEMENT SYSTEM</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            {syncing && <div style={{ fontSize:11, color:"#c8f0c8", display:"flex", alignItems:"center", gap:5 }}><span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:"#82dbb0", animation:"pulse 1s infinite" }}/>Saving…</div>}
            <div style={{ fontSize:12, color:"#c8f0c8" }}>
              {new Date().toLocaleDateString("en-PH", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
            </div>
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

        {/* ── Modals ── */}
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

        {deleteInvModal && (
          <div style={{ position:"fixed", inset:0, background:"#0007", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ background:"#fff", borderRadius:14, padding:34, minWidth:300, boxShadow:"0 8px 40px #0005", textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Remove from Inventory?</div>
              <div style={{ color:"#666", marginBottom:22, fontSize:13 }}>This will permanently remove this item.</div>
              <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                <button onClick={() => setDeleteInvModal(null)} style={{ ...btnSm, background:"#eee", padding:"9px 24px" }}>Cancel</button>
                <button onClick={() => handleDeleteInv(deleteInvModal)} style={{ ...btnSm, background:"#c84b00", color:"#fff", padding:"9px 24px" }}>Remove</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div style={{ textAlign:"center", padding:80, color:"#888", fontSize:15 }}>
            <div style={{ fontSize:32, marginBottom:12 }}>🍊</div>
            Loading data…
          </div>
        )}

        {!loading && (
          <div style={{ padding:"26px 28px", maxWidth:1300, margin:"0 auto" }}>

            {/* ════════════════ DASHBOARD ════════════════ */}
            {tab === "Dashboard" && (
              <div>
                <h2 style={{ fontSize:24, fontWeight:700, marginBottom:4, color:"#1a4a1a" }}>Dashboard</h2>
                <p style={{ color:"#777", marginBottom:22, fontSize:13 }}>Overview of your wholesale operations</p>

                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))", gap:15, marginBottom:26 }}>
                  {[
                    { label:"Products in Stock", val:inventory.length,      icon:"🍎", bg:"#f3e5f5" },
                    { label:"Total Transactions", val:transactions.length,  icon:"📋", bg:"#fce4ec" },
                    { label:"Stock IN Records",   val:transactions.filter(t=>t.type==="IN").length,  icon:"📦", bg:"#e8f5e9" },
                    { label:"Stock OUT Records",  val:transactions.filter(t=>t.type==="OUT").length, icon:"🚚", bg:"#fff3e0" },
                    { label:"Unique Suppliers",   val:allSuppliers.length,  icon:"🏪", bg:"#e3f2fd" },
                    { label:"Unique Consumers",   val:allConsumers.length,  icon:"🛒", bg:"#fce4ec" },
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
                      {["Date","Type","Fruit","Qty","Collector","Delivered By","Vehicle","Supplier","Consumer","Note"].map(h => <th key={h} style={TH}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {txDisplay.slice(0,6).map((tx,i) => (
                        <tr key={tx.id} style={{ background:i%2===0?"#fff":"#fafff8" }}>
                          <td style={TD}>{tx.date}</td>
                          <td style={TD}><Badge type={tx.type}/></td>
                          <td style={{ ...TD, fontWeight:700 }}>{fruitEmoji(tx.fruit)} {tx.fruit}</td>
                          <td style={TD}>{tx.qty} {tx.unit||"kg"}</td>
                          <td style={{ ...TD, color:"#555" }}>{tx.collector||"—"}</td>
                          <td style={{ ...TD, color:"#555" }}>{tx.deliveredBy||"—"}</td>
                          <td style={{ ...TD, color:"#555" }}>{tx.vehicle||"—"}</td>
                          <td style={{ ...TD, color:"#555" }}>{tx.type==="IN"?(tx.supplier||"—"):"—"}</td>
                          <td style={{ ...TD, color:"#555" }}>{tx.type==="OUT"?(tx.consumer||"—"):"—"}</td>
                          <td style={{ ...TD, color:"#999" }}>{tx.note||"—"}</td>
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
                <p style={{ color:"#777", marginBottom:22, fontSize:13 }}>Current stock levels — edit quantities or remove items</p>

                {editRow && (
                  <div style={{ position:"fixed", inset:0, background:"#0007", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ background:"#fff", borderRadius:14, padding:30, minWidth:340, boxShadow:"0 8px 40px #0005" }}>
                      <div style={{ fontSize:18, fontWeight:700, marginBottom:18 }}>Edit {editRow.fruit}</div>
                      <div style={{ ...fRow, marginBottom:14 }}>
                        <label style={fLabel}>Quantity</label>
                        <input type="number" min="0" step="0.01" value={editRow.qty}
                          onChange={e => setEditRow({ ...editRow, qty: parseFloat(e.target.value)||0 })} style={fInput}/>
                      </div>
                      <div style={{ ...fRow, marginBottom:14 }}>
                        <label style={fLabel}>Unit</label>
                        <UnitSelector value={editRow.unit||"kg"} onChange={u => setEditRow({...editRow, unit:u})} customUnits={customUnits}/>
                      </div>
                      <div style={{ display:"flex", gap:10, marginTop:16 }}>
                        <button onClick={() => setEditRow(null)} style={{ ...btnSm, background:"#eee", padding:"9px 22px" }}>Cancel</button>
                        <button onClick={handleEditSave} style={{ ...btnSm, background:"#1a8048", color:"#fff", padding:"9px 22px" }}>Save</button>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ ...card, overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr style={{ background:"#f5fbf5" }}>
                      {["Fruit","Qty","Unit","Actions"].map(h => <th key={h} style={TH}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {inventory.map((item, i) => (
                        <tr key={item.id} style={{ background:i%2===0?"#fff":"#fafff8" }}>
                          <td style={{ ...TD, fontWeight:700 }}>{fruitEmoji(item.fruit)} {item.fruit}</td>
                          <td style={{ ...TD, color: item.qty < 50 ? "#c84b00":"inherit", fontWeight: item.qty < 50 ? 700 : 400 }}>
                            {fmt(item.qty)} {item.qty < 50 ? "⚠":""}
                          </td>
                          <td style={TD}>{item.unit||"kg"}</td>
                          <td style={TD}>
                            <div style={{ display:"flex", gap:6 }}>
                              <button onClick={() => setEditRow({...item})} style={{ ...btnSm, background:"#e8f5e9", color:"#1a8048" }}>✏ Edit</button>
                              <button onClick={() => setDeleteInvModal(item.id)} style={{ ...btnSm, background:"#ffe4d4", color:"#c84b00" }}>✕ Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
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
                        <label style={fLabel}>Quantity <span style={{ color:"#c84b00" }}>*</span></label>
                        <input type="number" min="0.01" step="0.01" value={inForm.qty} onChange={e => setInForm({...inForm, qty:e.target.value})} style={fInput} placeholder="0" required/>
                      </div>
                    </div>
                    <div style={{ ...fRow, marginTop:12 }}>
                      <label style={fLabel}>Unit / Measurement</label>
                      <UnitSelector value={inForm.unit} onChange={u => { setInForm({...inForm, unit:u}); saveCustomUnit(u); }} customUnits={customUnits}/>
                      <span style={fHint}>Select how this stock is measured — or type a custom one</span>
                    </div>
                  </div>

                  <div style={{ background:"#f0f8ff", borderRadius:10, padding:"14px 16px", border:"1px dashed #82b8db" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#1a5a8a", marginBottom:12, letterSpacing:0.8 }}>🏪 SUPPLIER INFO</div>
                    <div style={fRow}>
                      <label style={fLabel}>Supplier / Farm</label>
                      <input value={inForm.supplier} onChange={e => setInForm({...inForm, supplier:e.target.value})} style={fInput} placeholder="Farm or vendor name"/>
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

                  <div style={fRow}>
                    <label style={fLabel}>Date</label>
                    <input type="date" value={inForm.date} onChange={e => setInForm({...inForm, date:e.target.value})} style={fInput}/>
                  </div>
                  <div style={fRow}>
                    <label style={fLabel}>Note</label>
                    <input value={inForm.note} onChange={e => setInForm({...inForm, note:e.target.value})} style={fInput} placeholder="Optional remarks"/>
                  </div>

                  <button type="submit" disabled={syncing} style={{ background:"linear-gradient(135deg,#1a4a1a,#2d7a2d)", color:"#fff", border:"none", borderRadius:10, padding:"13px", fontWeight:700, fontSize:15, cursor:syncing?"not-allowed":"pointer", fontFamily:"'Georgia',serif", opacity:syncing?0.7:1 }}>
                    {syncing ? "Saving…" : "↓ Record Stock IN"}
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
                          {inventory.map(i => <option key={i.id} value={i.fruit}>{fruitEmoji(i.fruit)} {i.fruit} ({fmt(i.qty)} {i.unit||"kg"} left)</option>)}
                        </select>
                      </div>
                      <div style={fRow}>
                        <label style={fLabel}>Quantity <span style={{ color:"#c84b00" }}>*</span></label>
                        <input type="number" min="0.01" step="0.01" value={outForm.qty} onChange={e => setOutForm({...outForm, qty:e.target.value})} style={fInput} placeholder="0" required/>
                        {outForm.fruit && outForm.qty && (() => { const inv2 = inventory.find(i => i.fruit === outForm.fruit); return inv2 && parseFloat(outForm.qty) > inv2.qty ? <span style={{ color:"#c84b00", fontSize:11 }}>⚠ Exceeds stock ({inv2.qty} {inv2.unit||"kg"})</span> : null; })()}
                      </div>
                    </div>
                    <div style={{ ...fRow, marginTop:12 }}>
                      <label style={fLabel}>Unit / Measurement</label>
                      <UnitSelector value={outForm.unit} onChange={u => { setOutForm({...outForm, unit:u}); saveCustomUnit(u); }} customUnits={customUnits}/>
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
                        <label style={fLabel}>What Vehicle</label>
                        <input value={outForm.vehicle} onChange={e => setOutForm({...outForm, vehicle:e.target.value})} style={fInput} placeholder="e.g. Multicab, Truck, L300…"/>
                      </div>
                    </div>
                  </div>

                  <div style={fRow}>
                    <label style={fLabel}>Date</label>
                    <input type="date" value={outForm.date} onChange={e => setOutForm({...outForm, date:e.target.value})} style={fInput}/>
                  </div>
                  <div style={fRow}>
                    <label style={fLabel}>Note</label>
                    <input value={outForm.note} onChange={e => setOutForm({...outForm, note:e.target.value})} style={fInput} placeholder="Optional remarks"/>
                  </div>

                  <button type="submit" disabled={syncing} style={{ background:"linear-gradient(135deg,#7a2d00,#c84b00)", color:"#fff", border:"none", borderRadius:10, padding:"13px", fontWeight:700, fontSize:15, cursor:syncing?"not-allowed":"pointer", fontFamily:"'Georgia',serif", opacity:syncing?0.7:1 }}>
                    {syncing ? "Saving…" : "↑ Record Stock OUT"}
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
                      {[
                        { label:"Type", key:"type", opts:[["","All Types"],["IN","IN only"],["OUT","OUT only"]] },
                      ].map(f => (
                        <div key={f.key} style={fRow}>
                          <label style={fLabel}>{f.label}</label>
                          <select value={filters[f.key]} onChange={e => setFilters({...filters,[f.key]:e.target.value})} style={fInput}>
                            {f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                      ))}
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
                      <div style={fRow}>
                        <label style={fLabel}>Vehicle (OUT)</label>
                        <select value={filters.vehicle} onChange={e => setFilters({...filters,vehicle:e.target.value})} style={fInput}>
                          <option value="">All Vehicles</option>
                          {allVehicles.map(v => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ ...card, padding:0, overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                    <thead>
                      <tr style={{ background:"#f5fbf5" }}>
                        {["#","Date","Type","Fruit","Qty","Collector","Delivered By","Vehicle","Supplier","Consumer","Note",""].map(h => <th key={h} style={TH}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTx.map((tx, i) => (
                        <tr key={tx.id} style={{ background:i%2===0?"#fff":"#fafff8" }}>
                          <td style={{...TD,color:"#bbb",fontSize:11}}>{i+1}</td>
                          <td style={{...TD,whiteSpace:"nowrap"}}>{tx.date}</td>
                          <td style={TD}><Badge type={tx.type}/></td>
                          <td style={{...TD,fontWeight:700,whiteSpace:"nowrap"}}>{fruitEmoji(tx.fruit)} {tx.fruit}</td>
                          <td style={{...TD,whiteSpace:"nowrap"}}>{tx.qty} {tx.unit||"kg"}</td>
                          <td style={{...TD,color:"#555"}}>{tx.collector||"—"}</td>
                          <td style={{...TD,color:"#555"}}>{tx.deliveredBy||"—"}</td>
                          <td style={{...TD,color:"#555"}}>{tx.type==="OUT"?(tx.vehicle||"—"):"—"}</td>
                          <td style={{...TD,color:"#555"}}>{tx.type==="IN"?(tx.supplier||"—"):"—"}</td>
                          <td style={{...TD,color:"#555"}}>{tx.type==="OUT"?(tx.consumer||"—"):"—"}</td>
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
                <p style={{ color:"#777", marginBottom:22, fontSize:13 }}>Volume and activity summary</p>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:22 }}>
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
                      { label:"Unique Vehicles",    val:allVehicles.length },
                    ].map(r => (
                      <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #f0f0f0" }}>
                        <span style={{ color:"#555", fontSize:13 }}>{r.label}</span>
                        <span style={{ fontWeight:700, color:"#1a4a1a" }}>{r.val}</span>
                      </div>
                    ))}
                  </div>

                  <div style={card}>
                    <div style={{ fontWeight:700, fontSize:15, marginBottom:14, color:"#1a4a1a" }}>🚚 Vehicle Usage</div>
                    {allVehicles.length === 0
                      ? <div style={{ color:"#aaa", fontSize:13 }}>No vehicle records yet.</div>
                      : allVehicles.map(v => {
                          const count = transactions.filter(t => t.vehicle === v).length;
                          return (
                            <div key={v} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #f0f0f0" }}>
                              <span style={{ color:"#555", fontSize:13 }}>🚛 {v}</span>
                              <span style={{ fontWeight:700, color:"#1a4a1a" }}>{count} trip{count!==1?"s":""}</span>
                            </div>
                          );
                        })
                    }
                  </div>
                </div>

                <div style={{ ...card, overflowX:"auto" }}>
                  <div style={{ fontWeight:700, fontSize:15, marginBottom:14, color:"#1a4a1a" }}>Per-Fruit Volume Breakdown</div>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                    <thead><tr style={{ background:"#f5fbf5" }}>
                      {["Fruit","Total IN","Total OUT","Current Stock"].map(h => <th key={h} style={TH}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {[...new Set(transactions.map(t => t.fruit))].sort().map(f => {
                        const inQty  = transactions.filter(t => t.type==="IN"  && t.fruit===f).reduce((a,b) => a+b.qty, 0);
                        const outQty = transactions.filter(t => t.type==="OUT" && t.fruit===f).reduce((a,b) => a+b.qty, 0);
                        const stock  = inventory.find(i => i.fruit===f);
                        return (
                          <tr key={f}>
                            <td style={{...TD,fontWeight:700}}>{fruitEmoji(f)} {f}</td>
                            <td style={TD}>{fmt(inQty)}</td>
                            <td style={TD}>{fmt(outQty)}</td>
                            <td style={TD}>{stock ? `${fmt(stock.qty)} ${stock.unit||"kg"}` : "—"}</td>
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
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </>
  );
}
