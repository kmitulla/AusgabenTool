import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createDestination, updateDestination, deleteDestination
} from '../utils/db';
import { useVacation } from '../contexts/VacationContext';
import { useAuth } from '../contexts/AuthContext';
import { sanitizeAmountInput, amountInputToNumeric } from '../utils/format';
import {
  Plus, Trash2, Edit3, MapPin, Calendar, Clock, Users, StickyNote,
  Check, X, ChevronDown, ChevronUp, Archive, RotateCcw, Download,
  Euro, Search, Navigation, Map
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Styles ──────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    padding: '2rem 1rem 6rem',
  },
  container: { maxWidth: '900px', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' },
  headerIcon: {
    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    borderRadius: '16px', width: '48px', height: '48px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)',
  },
  title: { fontSize: '1.75rem', fontWeight: 700, color: '#f1f5f9', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: '0.875rem', color: '#94a3b8', margin: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' },
  card: (completed) => ({
    background: completed ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(16px)', borderRadius: '16px',
    border: completed ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
    padding: '1.25rem', position: 'relative', overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    opacity: completed ? 0.7 : 1,
  }),
  cardTitle: { fontSize: '1.1rem', fontWeight: 600, color: '#f1f5f9', margin: '0 0 0.5rem' },
  cardMeta: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' },
  badge: (color) => ({
    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
    padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 600,
    background: `${color}20`, color: color, border: `1px solid ${color}40`,
  }),
  cardActions: { display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' },
  iconBtn: (bg) => ({
    display: 'flex', alignItems: 'center', gap: '0.3rem',
    padding: '0.4rem 0.7rem', borderRadius: '10px', border: 'none',
    background: bg || 'rgba(255,255,255,0.08)', color: '#e2e8f0',
    fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500,
  }),
  addBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
    width: '100%', padding: '1rem', borderRadius: '16px',
    border: '2px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.03)',
    color: '#94a3b8', fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer',
    marginBottom: '1.5rem',
  },
  // Modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    zIndex: 2000,
    paddingTop: 'max(1rem, env(safe-area-inset-top))',
    paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
    paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
    paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
    overflowY: 'auto',
  },
  modal: {
    background: 'linear-gradient(160deg, rgba(30,41,59,0.96), rgba(15,23,42,0.96))',
    backdropFilter: 'blur(20px) saturate(160%)',
    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: '560px',
    padding: '1.25rem 1.1rem 1.1rem', color: '#f1f5f9', position: 'relative',
    boxShadow: '0 20px 60px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
  },
  modalTitle: { fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.9rem', color: '#f8fafc', letterSpacing: '-0.01em' },
  label: { fontSize: '0.72rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: {
    width: '100%', padding: '0.6rem 0.8rem', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)',
    color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
    minWidth: 0,
    lineHeight: 1.3,
  },
  textarea: {
    width: '100%', padding: '0.6rem 0.8rem', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)',
    color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', minHeight: '72px',
    resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
  },
  row: { display: 'flex', gap: '0.6rem', marginBottom: '0.6rem', flexWrap: 'wrap' },
  field: { marginBottom: '0.7rem' },
  primaryBtn: {
    padding: '0.7rem 1.5rem', borderRadius: '12px', border: 'none',
    background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff',
    fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', width: '100%',
  },
  sectionLabel: {
    fontSize: '0.95rem', fontWeight: 600, color: '#cbd5e1',
    margin: '1rem 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
  },
  archiveToggle: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.6rem 1rem', borderRadius: '12px', border: 'none',
    background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
    fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500,
    margin: '1.5rem 0 1rem',
  },
  costRow: {
    display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem',
  },
  participantChip: (selected) => ({
    padding: '0.35rem 0.75rem', borderRadius: '99px', border: 'none',
    background: selected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.08)',
    color: selected ? '#93c5fd' : '#94a3b8', fontSize: '0.8rem',
    cursor: 'pointer', fontWeight: selected ? 600 : 400,
    border: selected ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent',
  }),
  empty: {
    textAlign: 'center', color: '#64748b', padding: '3rem 1rem',
    fontSize: '0.95rem',
  },
};

// ─── Map Component ───────────────────────────────────────
function MapPicker({ lat, lng, onLocationChange, address, onAddressChange }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView(
      [lat || 48.2082, lng || 16.3738], lat ? 14 : 5
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    if (lat && lng) {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    }
    map.on('click', async (e) => {
      const { lat: newLat, lng: newLng } = e.latlng;
      if (markerRef.current) map.removeLayer(markerRef.current);
      markerRef.current = L.marker([newLat, newLng]).addTo(map);
      onLocationChange(newLat, newLng);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${newLat}&lon=${newLng}&format=json&accept-language=de`
        );
        const data = await res.json();
        if (data.display_name) onAddressChange(data.display_name);
      } catch { /* ignore */ }
    });
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // Update marker when lat/lng props change externally
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (lat && lng) {
      if (markerRef.current) map.removeLayer(markerRef.current);
      markerRef.current = L.marker([lat, lng]).addTo(map);
      map.setView([lat, lng], 14);
    }
  }, [lat, lng]);

  const handleSearch = async () => {
    const q = searchQuery.trim() || address;
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=de`
      );
      const results = await res.json();
      if (results.length > 0) {
        const { lat: fLat, lon: fLng, display_name } = results[0];
        const nLat = parseFloat(fLat);
        const nLng = parseFloat(fLng);
        onLocationChange(nLat, nLng);
        onAddressChange(display_name);
        const map = mapInstanceRef.current;
        if (map) {
          if (markerRef.current) map.removeLayer(markerRef.current);
          markerRef.current = L.marker([nLat, nLng]).addTo(map);
          map.setView([nLat, nLng], 14);
        }
      }
    } catch { /* ignore */ }
    setSearching(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input
          style={{ ...styles.input, flex: 1 }}
          placeholder="Ort suchen..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          style={{ ...styles.iconBtn('rgba(59,130,246,0.3)'), padding: '0.5rem 0.8rem' }}
        >
          <Search size={16} /> {searching ? '...' : 'Suchen'}
        </button>
      </div>
      <div
        ref={mapRef}
        style={{ width: '100%', height: '250px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}
      />
      <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '0.3rem 0 0' }}>
        Klicke auf die Karte um einen Pin zu setzen
      </p>
    </div>
  );
}

// ─── Overview Map ────────────────────────────────────────
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

function OverviewMap({ destinations, onSelect, onClose }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const withCoords = destinations.filter(d => d.lat && d.lng);
    const center = withCoords.length > 0
      ? [withCoords[0].lat, withCoords[0].lng]
      : [48.2082, 16.3738];
    const map = L.map(mapRef.current).setView(center, 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    withCoords.forEach(dest => {
      const icon = dest.completed ? greenIcon : orangeIcon;
      const marker = L.marker([dest.lat, dest.lng], { icon }).addTo(map);
      marker.on('click', () => setSelected(dest));
    });
    if (withCoords.length > 1) {
      const bounds = L.latLngBounds(withCoords.map(d => [d.lat, d.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (withCoords.length === 1) {
      map.setView([withCoords[0].lat, withCoords[0].lng], 12);
    }
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [destinations]);

  const totalCost = selected ? (selected.costs || []).reduce((s, c) => s + (parseFloat(c.amount) || 0), 0) : 0;

  return (
    <motion.div
      style={styles.overlay}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: '800px', height: '85vh', display: 'flex', flexDirection: 'column', borderRadius: '20px', overflow: 'hidden', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '1rem' }}><Map size={16} style={{ marginRight: '0.4rem', verticalAlign: '-2px' }} />Alle Urlaubsziele</span>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} /> Geplant</span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> Erledigt</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
          </div>
        </div>
        <div ref={mapRef} style={{ flex: 1 }} />
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.95)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                    <h4 style={{ margin: 0, color: '#f1f5f9', fontSize: '1rem' }}>{selected.title}</h4>
                    {selected.completed && <span style={styles.badge('#22c55e')}><Check size={10} /> Erledigt</span>}
                  </div>
                  {selected.date && <div style={{ ...styles.cardMeta, marginBottom: '0.2rem' }}><Calendar size={12} /> {selected.date}{selected.timeFrom && ` ${selected.timeFrom}`}{selected.timeTo && ` - ${selected.timeTo}`}</div>}
                  {selected.address && <div style={{ ...styles.cardMeta, marginBottom: '0.2rem' }}><MapPin size={12} /> {selected.address}</div>}
                  {totalCost > 0 && <span style={styles.badge('#f59e0b')}><Euro size={10} /> {totalCost.toFixed(2).replace('.', ',')} EUR</span>}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <motion.button whileTap={{ scale: 0.9 }} style={styles.iconBtn('rgba(59,130,246,0.2)')} onClick={() => { onClose(); onSelect(selected); }}>
                    <Edit3 size={14} /> Öffnen
                  </motion.button>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={16} /></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── ICS Calendar Export ─────────────────────────────────
function generateICS(dest, participants) {
  const formatDate = (date, time) => {
    if (!date) return '';
    const d = date.replace(/-/g, '');
    const t = time ? time.replace(/:/g, '') + '00' : '000000';
    return `${d}T${t}`;
  };
  const escapeICS = (str) => (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const totalCost = (dest.costs || []).reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  const costLines = (dest.costs || []).map(c => `- ${c.description}: ${parseFloat(c.amount || 0).toFixed(2)} EUR`).join('\\n');
  const personList = (dest.participants || []).join(', ');

  let description = '';
  if (dest.notes) description += escapeICS(dest.notes) + '\\n\\n';
  if (totalCost > 0) description += `Voraussichtliche Kosten: ${totalCost.toFixed(2)} EUR\\n${costLines}\\n\\n`;
  if (personList) description += `Teilnehmer: ${personList}\\n`;

  const dtStart = formatDate(dest.date, dest.timeFrom);
  const dtEnd = formatDate(dest.date, dest.timeTo || dest.timeFrom);
  const location = escapeICS(dest.address || '');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AusgabenTool//Urlaubsziele//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd || dtStart}`,
    `SUMMARY:${escapeICS(dest.title)}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

function downloadICS(dest, participants) {
  const ics = generateICS(dest, participants);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(dest.title || 'urlaubsziel').replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Main Component ──────────────────────────────────────
export default function Destinations() {
  const { currentVacation, destinations, refreshDestinations } = useVacation();
  const { currentUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editDest, setEditDest] = useState(null);
  const [showArchive, setShowArchive] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showOverviewMap, setShowOverviewMap] = useState(false);

  const participants = currentVacation?.settings?.participants || [];

  const emptyForm = useCallback(() => ({
    title: '', notes: '', date: '', timeFrom: '', timeTo: '',
    address: '', lat: null, lng: null,
    participants: [], costs: [{ description: '', amount: '' }],
    completed: false,
  }), []);

  const [form, setForm] = useState(emptyForm());

  const openCreate = () => { setEditDest(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit = (dest) => {
    setEditDest(dest);
    setForm({
      title: dest.title || '',
      notes: dest.notes || '',
      date: dest.date || '',
      timeFrom: dest.timeFrom || '',
      timeTo: dest.timeTo || '',
      address: dest.address || '',
      lat: dest.lat || null,
      lng: dest.lng || null,
      participants: dest.participants || [],
      costs: dest.costs?.length ? dest.costs : [{ description: '', amount: '' }],
      completed: dest.completed || false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!currentVacation || !form.title.trim()) return;
    setSaving(true);
    setSaveError('');
    try {
      const data = {
        title: form.title,
        notes: form.notes || '',
        date: form.date || '',
        timeFrom: form.timeFrom || '',
        timeTo: form.timeTo || '',
        address: form.address || '',
        participants: form.participants || [],
        costs: (form.costs || []).filter(c => c.description.trim() || c.amount),
        completed: form.completed || false,
      };
      if (form.lat != null && form.lng != null) {
        data.lat = form.lat;
        data.lng = form.lng;
      }
      if (editDest) {
        await updateDestination(editDest.id, data);
      } else {
        await createDestination(currentVacation.id, data);
      }
      await refreshDestinations();
      setShowModal(false);
    } catch (err) {
      console.error('Save error:', err);
      setSaveError('Fehler beim Speichern: ' + (err.message || 'Unbekannt'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteDestination(id);
    setDeleteConfirm(null);
    await refreshDestinations();
  };

  const handleToggleComplete = async (dest) => {
    await updateDestination(dest.id, { completed: !dest.completed });
    await refreshDestinations();
  };

  const updateCost = (index, key, value) => {
    const costs = [...form.costs];
    costs[index] = { ...costs[index], [key]: value };
    setForm(f => ({ ...f, costs }));
  };
  const addCost = () => setForm(f => ({ ...f, costs: [...f.costs, { description: '', amount: '' }] }));
  const removeCost = (index) => setForm(f => ({ ...f, costs: f.costs.filter((_, i) => i !== index) }));
  const toggleParticipant = (name) => {
    setForm(f => ({
      ...f,
      participants: f.participants.includes(name)
        ? f.participants.filter(p => p !== name)
        : [...f.participants, name],
    }));
  };

  if (!currentVacation) {
    return (
      <div style={styles.page}>
        <div style={styles.empty}>Bitte zuerst einen Urlaub auswählen.</div>
      </div>
    );
  }

  const filterDest = (d) => {
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase();
    return (d.title || '').toLowerCase().includes(q)
      || (d.address || '').toLowerCase().includes(q)
      || (d.notes || '').toLowerCase().includes(q)
      || (d.participants || []).some(p => p.toLowerCase().includes(q));
  };
  const active = (destinations || []).filter(d => !d.completed && filterDest(d));
  const archived = (destinations || []).filter(d => d.completed && filterDest(d));
  const totalEstimated = active.reduce((s, d) => s + (d.costs || []).reduce((ss, c) => ss + (parseFloat(c.amount) || 0), 0), 0);

  const formatDate = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}.${m}.${y}`;
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerIcon}><MapPin size={26} color="#fff" /></div>
          <div>
            <h1 style={styles.title}>Urlaubsziele</h1>
            <p style={styles.subtitle}>
              {active.length} Ziel{active.length !== 1 ? 'e' : ''} geplant
              {totalEstimated > 0 && ` \u00b7 ca. ${totalEstimated.toFixed(2).replace('.', ',')} \u20ac`}
            </p>
          </div>
        </div>

        {/* Search + Map Button */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              style={{ ...styles.input, paddingLeft: '2.2rem' }}
              placeholder="Ziele durchsuchen..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.93 }}
            style={{ ...styles.iconBtn('rgba(59,130,246,0.2)'), padding: '0.65rem 0.85rem', fontSize: '0.8rem' }}
            onClick={() => setShowOverviewMap(true)}
          >
            <Map size={18} /> Karte
          </motion.button>
        </div>

        {/* Add Button */}
        <motion.button
          style={styles.addBtn}
          whileHover={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(245,158,11,0.4)' }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreate}
        >
          <Plus size={20} /> Neues Urlaubsziel hinzufügen
        </motion.button>

        {/* Active Cards */}
        {active.length === 0 && !showArchive && (
          <div style={styles.empty}>
            <MapPin size={40} style={{ marginBottom: '0.5rem', opacity: 0.3 }} /><br />
            Noch keine Urlaubsziele erstellt.<br />Erstelle dein erstes Ziel!
          </div>
        )}

        <div style={styles.grid}>
          <AnimatePresence>
            {active.map((dest, i) => {
              const totalCost = (dest.costs || []).reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
              return (
                <motion.div
                  key={dest.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  style={styles.card(false)}
                >
                  <h3 style={styles.cardTitle}>{dest.title}</h3>

                  {dest.date && (
                    <div style={styles.cardMeta}>
                      <Calendar size={13} /> {formatDate(dest.date)}
                      {dest.timeFrom && <><Clock size={13} style={{ marginLeft: '0.4rem' }} /> {dest.timeFrom}{dest.timeTo && ` - ${dest.timeTo}`}</>}
                    </div>
                  )}
                  {dest.address && (
                    <div style={styles.cardMeta}>
                      <MapPin size={13} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                        {dest.address}
                      </span>
                    </div>
                  )}
                  {(dest.participants || []).length > 0 && (
                    <div style={styles.cardMeta}>
                      <Users size={13} /> {dest.participants.join(', ')}
                    </div>
                  )}
                  {totalCost > 0 && (
                    <div style={{ marginTop: '0.4rem' }}>
                      <span style={styles.badge('#f59e0b')}>
                        <Euro size={11} /> ca. {totalCost.toFixed(2).replace('.', ',')} EUR
                      </span>
                    </div>
                  )}
                  {dest.notes && (
                    <div style={{ ...styles.cardMeta, marginTop: '0.4rem', fontStyle: 'italic', color: '#64748b' }}>
                      <StickyNote size={13} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                        {dest.notes}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={styles.cardActions}>
                    <motion.button whileTap={{ scale: 0.9 }} style={styles.iconBtn('rgba(34,197,94,0.2)')} onClick={() => handleToggleComplete(dest)}>
                      <Check size={14} /> Erledigt
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.9 }} style={styles.iconBtn()} onClick={() => openEdit(dest)}>
                      <Edit3 size={14} /> Bearbeiten
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.9 }} style={styles.iconBtn('rgba(59,130,246,0.2)')} onClick={() => downloadICS(dest, participants)}>
                      <Download size={14} /> Kalender
                    </motion.button>
                    {deleteConfirm === dest.id ? (
                      <>
                        <motion.button whileTap={{ scale: 0.9 }} style={styles.iconBtn('rgba(239,68,68,0.3)')} onClick={() => handleDelete(dest.id)}>
                          <Check size={14} /> Ja
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.9 }} style={styles.iconBtn()} onClick={() => setDeleteConfirm(null)}>
                          <X size={14} /> Nein
                        </motion.button>
                      </>
                    ) : (
                      <motion.button whileTap={{ scale: 0.9 }} style={styles.iconBtn('rgba(239,68,68,0.15)')} onClick={() => setDeleteConfirm(dest.id)}>
                        <Trash2 size={14} />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Archive Section */}
        {archived.length > 0 && (
          <>
            <motion.button
              style={styles.archiveToggle}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowArchive(v => !v)}
            >
              <Archive size={16} />
              Archiv ({archived.length} abgeschlossen)
              {showArchive ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </motion.button>

            <AnimatePresence>
              {showArchive && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={styles.grid}>
                    {archived.map((dest, i) => {
                      const totalCost = (dest.costs || []).reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
                      return (
                        <motion.div
                          key={dest.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          style={styles.card(true)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                            <span style={styles.badge('#22c55e')}><Check size={11} /> Erledigt</span>
                          </div>
                          <h3 style={styles.cardTitle}>{dest.title}</h3>
                          {dest.date && (
                            <div style={styles.cardMeta}>
                              <Calendar size={13} /> {formatDate(dest.date)}
                              {dest.timeFrom && <><Clock size={13} style={{ marginLeft: '0.4rem' }} /> {dest.timeFrom}{dest.timeTo && ` - ${dest.timeTo}`}</>}
                            </div>
                          )}
                          {dest.address && <div style={styles.cardMeta}><MapPin size={13} /> {dest.address}</div>}
                          {totalCost > 0 && <span style={styles.badge('#f59e0b')}><Euro size={11} /> {totalCost.toFixed(2).replace('.', ',')} EUR</span>}
                          <div style={styles.cardActions}>
                            <motion.button whileTap={{ scale: 0.9 }} style={styles.iconBtn('rgba(59,130,246,0.2)')} onClick={() => handleToggleComplete(dest)}>
                              <RotateCcw size={14} /> Reaktivieren
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.9 }} style={styles.iconBtn()} onClick={() => openEdit(dest)}>
                              <Edit3 size={14} />
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.9 }} style={styles.iconBtn('rgba(59,130,246,0.2)')} onClick={() => downloadICS(dest, participants)}>
                              <Download size={14} />
                            </motion.button>
                            {deleteConfirm === dest.id ? (
                              <>
                                <motion.button whileTap={{ scale: 0.9 }} style={styles.iconBtn('rgba(239,68,68,0.3)')} onClick={() => handleDelete(dest.id)}>
                                  <Check size={14} /> Ja
                                </motion.button>
                                <motion.button whileTap={{ scale: 0.9 }} style={styles.iconBtn()} onClick={() => setDeleteConfirm(null)}>
                                  <X size={14} />
                                </motion.button>
                              </>
                            ) : (
                              <motion.button whileTap={{ scale: 0.9 }} style={styles.iconBtn('rgba(239,68,68,0.15)')} onClick={() => setDeleteConfirm(dest.id)}>
                                <Trash2 size={14} />
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Overview Map */}
        <AnimatePresence>
          {showOverviewMap && (
            <OverviewMap
              destinations={destinations || []}
              onSelect={(dest) => openEdit(dest)}
              onClose={() => setShowOverviewMap(false)}
            />
          )}
        </AnimatePresence>

        {/* Create / Edit Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              style={styles.overlay}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
            >
              <motion.div
                style={styles.modal}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.95 }}
                onClick={e => e.stopPropagation()}
              >
                <h2 style={styles.modalTitle}>
                  {editDest ? 'Urlaubsziel bearbeiten' : 'Neues Urlaubsziel'}
                </h2>

                {/* Title */}
                <div style={styles.field}>
                  <label style={styles.label}>Ziel / Aktivität *</label>
                  <input
                    style={styles.input}
                    placeholder="z.B. Colosseum besichtigen"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>

                {/* Date + Time */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label style={styles.label}>Datum</label>
                    <input type="date" style={styles.input} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={styles.label}>Von</label>
                      <input type="time" style={styles.input} value={form.timeFrom} onChange={e => setForm(f => ({ ...f, timeFrom: e.target.value }))} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={styles.label}>Bis</label>
                      <input type="time" style={styles.input} value={form.timeTo} onChange={e => setForm(f => ({ ...f, timeTo: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div style={styles.field}>
                  <label style={styles.label}>Adresse</label>
                  <input
                    style={styles.input}
                    placeholder="Adresse eingeben..."
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  />
                </div>

                {/* Map */}
                <div style={styles.field}>
                  <label style={styles.label}><Navigation size={14} /> Karte (klicke oder suche)</label>
                  <MapPicker
                    lat={form.lat}
                    lng={form.lng}
                    address={form.address}
                    onLocationChange={(lat, lng) => setForm(f => ({ ...f, lat, lng }))}
                    onAddressChange={(addr) => setForm(f => ({ ...f, address: addr }))}
                  />
                </div>

                {/* Participants */}
                {participants.length > 0 && (
                  <div style={styles.field}>
                    <label style={styles.label}><Users size={14} /> Teilnehmer</label>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {participants.map(p => (
                        <button
                          key={p}
                          style={styles.participantChip(form.participants.includes(p))}
                          onClick={() => toggleParticipant(p)}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Costs */}
                <div style={styles.field}>
                  <label style={styles.label}><Euro size={14} /> Voraussichtliche Kosten</label>
                  {form.costs.map((cost, i) => (
                    <div key={i} style={styles.costRow}>
                      <input
                        style={{ ...styles.input, flex: 2 }}
                        placeholder="Beschreibung"
                        value={cost.description}
                        onChange={e => updateCost(i, 'description', e.target.value)}
                      />
                      <input
                        style={{ ...styles.input, flex: 1 }}
                        placeholder="Betrag"
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*[,.]?[0-9]*"
                        value={(cost.amount || '').toString().replace('.', ',')}
                        onChange={e => {
                          const clean = sanitizeAmountInput(e.target.value);
                          updateCost(i, 'amount', amountInputToNumeric(clean));
                        }}
                      />
                      {form.costs.length > 1 && (
                        <button style={{ ...styles.iconBtn('rgba(239,68,68,0.2)'), padding: '0.5rem' }} onClick={() => removeCost(i)}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button style={{ ...styles.iconBtn('rgba(255,255,255,0.06)'), marginTop: '0.3rem' }} onClick={addCost}>
                    <Plus size={14} /> Weitere Kosten
                  </button>
                </div>

                {/* Notes */}
                <div style={styles.field}>
                  <label style={styles.label}><StickyNote size={14} /> Notizen</label>
                  <textarea
                    style={styles.textarea}
                    placeholder="Notizen, Tipps, Links..."
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>

                {/* Error */}
                {saveError && (
                  <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', padding: '0.6rem 0.85rem', color: '#fca5a5', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    {saveError}
                  </div>
                )}

                {/* Save / Cancel */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button style={{ ...styles.iconBtn(), flex: 1, justifyContent: 'center', padding: '0.7rem' }} onClick={() => setShowModal(false)}>
                    Abbrechen
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    style={{ ...styles.primaryBtn, flex: 2, opacity: saving ? 0.6 : 1 }}
                    onClick={handleSave}
                    disabled={saving || !form.title.trim()}
                  >
                    {saving ? 'Speichern...' : editDest ? 'Speichern' : 'Erstellen'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
