import React, { useMemo, useState } from 'react'
import { useStore } from '../store'
import { Card, Badge, Field } from '../components/ui'

export default function Onboarding() {
  const { db } = useStore()
  const [routerId, setRouterId] = useState(db.routers[0]?.id ?? '')
  const [profileId, setProfileId] = useState(db.hotspotProfiles[0]?.id ?? '')
  const [copied, setCopied] = useState(false)

  const router = db.routers.find(r => r.id === routerId)
  const profile = db.hotspotProfiles.find(p => p.id === profileId)

  const script = useMemo(() => {
    if (!router || !profile) return ''
    const portalHost = 'fuelpro.pages.dev'
    return `# FuelPro Billing onboarding for ${router.name}
# Run in Winbox/WebFig terminal with system-router admin rights

/interface wireless set [ find ] mode=ap-bridge ssid="${router.name}"
/ip hotspot profile add name="${profile.name}" hotspot-address=${router.ip} html-directory=hotspot
/ip hotspot add name="${profile.name}" interface=bridge address-pool=dhcp-pool profile="${profile.name}"
/ip hotspot user profile add name="fuelpro" add-mac-cookie=yes
/queue simple add name="fuelpro-rate" target=bridge max-limit=${profile.rateLimitMbps}M/${profile.rateLimitMbps}M
/queue simple set [ find name="fuelpro-rate" ] parent=none

# Session + idle policy
:put "Session timeout: ${profile.sessionTimeoutMin}min"
:put "Idle timeout: ${profile.idleTimeoutMin}min"

# RADIUS (FuelPro server)
/radius add service=hotspot,ppp address=${portalHost} secret=FuelProSecret timeout=3s
/radius incoming set accept=yes port=3799
/aaa set use-radius=yes accounting=yes interim-update=00:10:00

# Allow walled garden + captive portal to reach FuelPro
/ip firewall address-list add list=fuelpro-whitelist address=${portalHost}
/ip hotspot walled-garden add dst-address=${portalHost} action=allow

:put "Onboarding complete — hotspot '${profile.name}' linked to FuelPro at ${portalHost}"`
  }, [router, profile])

  const copy = async () => {
    try { await navigator.clipboard.writeText(script); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* clipboard blocked */ }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">MikroTik Onboarding</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Generate a ready-to-paste RouterOS script that links a router to FuelPro Billing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="1. Pick a router">
          <Field label="Router">
            <select className="input" value={routerId} onChange={e => setRouterId(e.target.value)}>
              {db.routers.map(r => <option key={r.id} value={r.id}>{r.name} — {r.location}</option>)}
            </select>
          </Field>
          <Field label="Hotspot profile">
            <select className="input" value={profileId} onChange={e => setProfileId(e.target.value)}>
              {db.hotspotProfiles.map(p => <option key={p.id} value={p.id}>{p.name} ({p.rateLimitMbps} Mbps)</option>)}
            </select>
          </Field>
          <div className="flex flex-wrap gap-2 mt-4">
            {db.hotspotProfiles.length === 0 && <Badge color="amber">Create a hotspot profile first</Badge>}
            <Badge color="blue">{db.routers.filter(r => r.status === 'online').length} online router{db.routers.length === 1 ? '' : 's'}</Badge>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card title="2. Copy the script" subtitle="Paste into Winbox/WebFig terminal on the router">
            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-[11px] font-mono overflow-x-auto max-h-[480px]">{script}</pre>
              <button className="btn-ghost !text-xs absolute top-3 right-3" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
            </div>
          </Card>
        </div>
      </div>

      <Card title="Steps" subtitle="What the script configures on the router">
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
          <li>Sets AP SSID to the router name.</li>
          <li>Creates the hotspot and links it to the selected hotspot profile.</li>
          <li>Adds a rate-limit queue equal to the profile bandwidth cap.</li>
          <li>Points RADIUS at the FuelPro portal with accounting + CoA (auth/disconnect).</li>
          <li>Whitelists the FuelPro portal in walled-garden so login works.</li>
        </ol>
      </Card>
    </div>
  )
}
