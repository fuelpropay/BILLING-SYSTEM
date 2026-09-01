import React, { useMemo, useState } from 'react'
import { useStore, fmtMoney, uid } from '../store'
import { Card, Badge, statusColor, Modal, Field, EmptyState, SearchInput, downloadCSV } from '../components/ui'
import { useNames, SubSelect } from '../apiUse'
import type { InventoryItem } from '../types'

const empty: Omit<InventoryItem, 'id'> = { name: '', sku: '', category: 'CPE Router', supplier: '', cost: 0, serial: '', status: 'in_stock', location: 'stockroom', assignedTo: '', notes: '' }

export default function Inventory() {
  const { db, update, log } = useStore()
  const [q, setQ] = useState('')
  const [statusF, setStatusF] = useState('all')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState(empty)
  const [assignTarget, setAssignTarget] = useState('')

  const subIds = db.inventory.filter(it => it.location === 'subscriber').map(it => it.assignedTo)
  const { name: subName } = useNames(subIds)
  const nameOf = (item: InventoryItem) => {
    if (item.location === 'subscriber') return subName(item.assignedTo)
    if (item.location === 'router') return db.routers.find(r => r.id === item.assignedTo)?.name ?? '—'
    return 'Stockroom'
  }

  const rows = useMemo(() => db.inventory.filter(it => {
    const text = `${it.name} ${it.sku} ${it.serial} ${it.category} ${it.supplier} ${nameOf(it)}`.toLowerCase()
    return text.includes(q.toLowerCase()) && (statusF === 'all' || it.status === statusF)
  }), [db.inventory, subName, db.routers, q, statusF])

  const openNew = () => { setEditing(null); setForm(empty); setAssignTarget(''); setModal(true) }
  const openEdit = (it: InventoryItem) => { setEditing(it); setForm({ ...it }); setAssignTarget(it.assignedTo); setModal(true) }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const resolved: Omit<InventoryItem, 'id'> = { ...form, assignedTo: form.location === 'stockroom' ? '' : assignTarget }
    if (editing) {
      update(d => ({ ...d, inventory: d.inventory.map(i => i.id === editing.id ? { ...resolved, id: editing.id } : i) }))
      log('update', 'inventory', `Updated item ${form.name}`)
    } else {
      update(d => ({ ...d, inventory: [{ ...resolved, id: uid() }, ...d.inventory] }))
      log('create', 'inventory', `Added ${form.name} (${form.sku})`)
    }
    setModal(false)
  }

  const remove = (it: InventoryItem) => {
    if (!confirm(`Delete ${it.name}?`)) return
    update(d => ({ ...d, inventory: d.inventory.filter(i => i.id !== it.id) }))
    log('delete', 'inventory', `Removed ${it.name} (${it.serial || it.sku})`)
  }

  const setStatus = (it: InventoryItem, status: InventoryItem['status']) => {
    update(d => ({ ...d, inventory: d.inventory.map(i => i.id === it.id ? { ...i, status, location: status === 'in_stock' || status === 'faulty' || status === 'returned' ? 'stockroom' : i.location } : i) }))
    log('update', 'inventory', `${it.name} marked as ${status}`)
  }

  const deployed = db.inventory.filter(i => i.status === 'deployed').length
  const stockValue = db.inventory.filter(i => i.status === 'in_stock').reduce((s, i) => s + i.cost, 0)
  const faulty = db.inventory.filter(i => i.status === 'faulty').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Inventory</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{db.inventory.length} items · {deployed} deployed · {fmtMoney(stockValue)} in stock</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost !text-xs" onClick={() => downloadCSV('inventory.csv', ['Item', 'SKU', 'Category', 'Supplier', 'Cost', 'Serial', 'Status', 'Location'],
            rows.map(i => [i.name, i.sku, i.category, i.supplier, i.cost, i.serial, i.status, nameOf(i)]))}>Export CSV</button>
          <button className="btn-primary !text-xs" onClick={openNew}>+ Add item</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Deployed</div><div className="text-2xl font-extrabold text-emerald-500 mt-1">{deployed}</div><div className="text-xs text-slate-400 mt-1">at customers &amp; routers</div></Card>
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Stock value</div><div className="text-2xl font-extrabold text-brand-500 mt-1">{fmtMoney(stockValue)}</div><div className="text-xs text-slate-400 mt-1">in-stock equipment cost</div></Card>
        <Card><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Faulty</div><div className="text-2xl font-extrabold text-rose-500 mt-1">{faulty}</div><div className="text-xs text-slate-400 mt-1">awaiting RMA or repair</div></Card>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-56"><SearchInput value={q} onChange={setQ} placeholder="Search item, SKU, serial, supplier…" /></div>
          <select className="input !w-auto" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="all">All statuses</option><option value="in_stock">In stock</option><option value="deployed">Deployed</option><option value="faulty">Faulty</option><option value="returned">Returned</option>
          </select>
        </div>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead><tr>
              <th className="th pl-5">Item</th><th className="th">Category</th><th className="th">Serial</th><th className="th">Supplier</th><th className="th">Cost</th><th className="th">Located at</th><th className="th">Status</th><th className="th pr-5">Actions</th>
            </tr></thead>
            <tbody>
              {rows.map(it => (
                <tr key={it.id} className="tr">
                  <td className="td pl-5"><div className="font-medium">{it.name}</div><div className="text-[10px] text-slate-400 font-mono">{it.sku}</div></td>
                  <td className="td text-xs">{it.category}</td>
                  <td className="td font-mono text-xs">{it.serial || '—'}</td>
                  <td className="td text-xs">{it.supplier || '—'}</td>
                  <td className="td text-xs">{it.cost > 0 ? fmtMoney(it.cost) : '—'}</td>
                  <td className="td text-xs">{nameOf(it)}</td>
                  <td className="td"><Badge color={statusColor(it.status) === 'slate' ? 'slate' : it.status === 'deployed' ? 'green' : it.status === 'in_stock' ? 'blue' : 'red'}>{it.status.replace('_', ' ')}</Badge></td>
                  <td className="td pr-5">
                    <div className="flex gap-2 text-xs font-semibold">
                      <button className="text-brand-500 hover:underline" onClick={() => openEdit(it)}>Edit</button>
                      {it.status !== 'faulty' && <button className="text-amber-500 hover:underline" onClick={() => setStatus(it, 'faulty')}>Mark faulty</button>}
                      {it.status === 'faulty' && <button className="text-emerald-500 hover:underline" onClick={() => setStatus(it, 'in_stock')}>Restock</button>}
                      <button className="text-rose-500 hover:underline" onClick={() => remove(it)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState text="No inventory items match." />}
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit item' : 'Add inventory item'} wide>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Item name"><input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="SKU"><input className="input font-mono" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></Field>
          <Field label="Category">
            <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {['CPE Router', 'Access Point', 'ONU', 'Radio', 'Antenna', 'Switch', 'Consumable', 'Infrastructure', 'Other'].map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Serial number"><input className="input font-mono" value={form.serial} onChange={e => setForm({ ...form, serial: e.target.value })} /></Field>
          <Field label="Supplier"><input className="input" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></Field>
          <Field label="Unit cost (KES)"><input className="input" type="number" min={0} value={form.cost} onChange={e => setForm({ ...form, cost: Number(e.target.value) })} /></Field>
          <Field label="Location">
            <select className="input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value as InventoryItem['location'] })}>
              <option value="stockroom">Stockroom</option><option value="subscriber">Customer premises</option><option value="router">Router / POP</option>
            </select>
          </Field>
          {form.location === 'subscriber' && (
            <Field label="Assign to subscriber">
              <SubSelect value={assignTarget} onChange={setAssignTarget} />
            </Field>
          )}
          {form.location === 'router' && (
            <Field label="Assign to router">
              <select className="input" value={assignTarget} onChange={e => setAssignTarget(e.target.value)} required>
                <option value="">Select…</option>
                {db.routers.map(r => <option key={r.id} value={r.id}>{r.name} — {r.location}</option>)}
              </select>
            </Field>
          )}
          <div className="sm:col-span-2"><Field label="Notes"><input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field></div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Save changes' : 'Add item'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
