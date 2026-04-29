import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiClient } from './api';

const DAY_FR   = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const SLOTS    = [6, 12, 18, 21];
const SLOT_LBL = ['Matinée', 'Journée', 'Soirée', 'Nuit'];

// ── utilitaires ───────────────────────────────────────────────────────────────
function weatherEmoji(code) {
  if (code == null) return '🌤️';
  if (code === 0)   return '☀️';
  if (code <= 2)    return '⛅';
  if (code <= 3)    return '☁️';
  if (code <= 48)   return '🌫️';
  if (code <= 55)   return '🌦️';
  if (code <= 67)   return '🌧️';
  if (code <= 77)   return '🌨️';
  if (code <= 82)   return '🌧️';
  if (code <= 86)   return '❄️';
  if (code <= 99)   return '⛈️';
  return '🌤️';
}

function windDir(deg) {
  if (deg == null) return '-';
  return ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(deg / 45) % 8];
}

function uvLabel(idx) {
  if (idx == null) return { text: '--', color: '#888' };
  if (idx <= 2)  return { text: `${idx} Faible`,     color: '#4caf50' };
  if (idx <= 5)  return { text: `${idx} Modéré`,     color: '#ff9800' };
  if (idx <= 7)  return { text: `${idx} Élevé`,      color: '#f44336' };
  if (idx <= 10) return { text: `${idx} Très élevé`, color: '#9c27b0' };
  return            { text: `${idx} Extrême`,     color: '#7b1fa2' };
}

function fmtTime(isoStr) {
  if (!isoStr) return '--';
  try {
    return isoStr.slice(11, 16);
  } catch { return '--'; }
}

// ── composant principal ───────────────────────────────────────────────────────
export default function ForecastDetail() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const city = params.city || 'Prévisions météo';
  const lat  = parseFloat(params.lat);
  const lon  = parseFloat(params.lon);

  const [forecast,    setForecast]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [selectedDay, setSelectedDay] = useState(0);

  useEffect(() => {
    if (isNaN(lat) || isNaN(lon)) { setError('Coordonnées manquantes.'); setLoading(false); return; }
    fetchForecast();
  }, []);

  const fetchForecast = async () => {
    setLoading(true); setError(null);
    try {
      const res = await apiClient.get('/api/geo/forecast', { params: { lat, lon } });
      setForecast(res.data);
    } catch (e) {
      setError('Impossible de charger les prévisions.');
    } finally {
      setLoading(false);
    }
  };

  // ── tableau horaire du jour sélectionné ──────────────────────────────────
  const getSlots = () => {
    if (!forecast?.hourly) return Array(4).fill({});
    const base = selectedDay * 24;
    return SLOTS.map(h => forecast.hourly[base + h] || {});
  };

  const renderContent = () => {
    if (loading) return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Chargement des prévisions...</Text>
      </View>
    );

    if (error || !forecast) return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Données indisponibles'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchForecast}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );

    const day   = forecast.daily[selectedDay] || {};
    const slots = getSlots();
    const uv    = uvLabel(day.uvIndexMax);

    const TRow = ({ label, alt, children }) => (
      <View style={[styles.tRow, alt && styles.tRowAlt]}>
        <View style={styles.tLabel}><Text style={styles.tLabelTxt} numberOfLines={2}>{label}</Text></View>
        {children}
      </View>
    );
    const TCol = ({ children }) => <View style={styles.tCol}>{children}</View>;

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── Sélecteur 10 jours ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.dayStrip} contentContainerStyle={styles.dayStripContent}>
          {forecast.daily.map((d, i) => {
            const dt    = new Date(d.date);
            const label = i === 0 ? 'Auj.' : i === 1 ? 'Dem.' : `${DAY_FR[dt.getDay()]}.${dt.getDate()}`;
            const hasRain = (d.precipitation || 0) >= 0.5;
            return (
              <TouchableOpacity key={i}
                style={[styles.dayCard, selectedDay === i && styles.dayCardActive, hasRain && styles.dayCardRain]}
                onPress={() => setSelectedDay(i)}>
                <Text style={[styles.dayCardLabel, selectedDay === i && styles.dayCardLabelActive]}>{label}</Text>
                <Text style={styles.dayCardEmoji}>{weatherEmoji(d.weathercode)}</Text>
                <Text style={styles.dayCardMax}>{d.tempMax != null ? `${Math.round(d.tempMax)}°` : '--'}</Text>
                <Text style={styles.dayCardMin}>{d.tempMin != null ? `${Math.round(d.tempMin)}°` : '--'}</Text>
                {hasRain
                  ? <Text style={styles.dayCardRainTxt}>💧{d.precipitation?.toFixed(1)}</Text>
                  : <Text style={styles.dayCardSunTxt}>☀️ Sec</Text>
                }
                {d.rainProba != null && (
                  <Text style={styles.dayCardProba}>{d.rainProba}%</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Résumé du jour sélectionné ── */}
        <View style={styles.daySummary}>
          <View style={styles.daySummaryTop}>
            <Text style={styles.daySummaryEmoji}>{weatherEmoji(day.weathercode)}</Text>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.daySummaryDate}>
                {selectedDay === 0 ? "Aujourd'hui" : selectedDay === 1 ? 'Demain'
                  : new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
              <Text style={styles.daySummaryTemps}>
                <Text style={styles.daySummaryMax}>{day.tempMax != null ? `${Math.round(day.tempMax)}°` : '--'}</Text>
                {'  /  '}
                <Text style={styles.daySummaryMin}>{day.tempMin != null ? `${Math.round(day.tempMin)}°` : '--'}</Text>
              </Text>
            </View>
          </View>

          <View style={styles.dayMetaRow}>
            <View style={styles.dayMetaItem}>
              <Text style={styles.dayMetaIcon}>💧</Text>
              <Text style={styles.dayMetaVal}>{(day.precipitation || 0).toFixed(1)} mm</Text>
              <Text style={styles.dayMetaLbl}>Précipitations</Text>
            </View>
            {day.rainProba != null && (
              <View style={styles.dayMetaItem}>
                <Text style={styles.dayMetaIcon}>🌂</Text>
                <Text style={styles.dayMetaVal}>{day.rainProba}%</Text>
                <Text style={styles.dayMetaLbl}>Probabilité pluie</Text>
              </View>
            )}
            <View style={styles.dayMetaItem}>
              <Text style={styles.dayMetaIcon}>💨</Text>
              <Text style={styles.dayMetaVal}>{day.windSpeedMax != null ? `${Math.round(day.windSpeedMax)} km/h` : '--'}</Text>
              <Text style={styles.dayMetaLbl}>Vent max</Text>
            </View>
            <View style={styles.dayMetaItem}>
              <Text style={styles.dayMetaIcon}>💧</Text>
              <Text style={styles.dayMetaVal}>{day.humidityMax != null ? `${day.humidityMax}%` : '--'}</Text>
              <Text style={styles.dayMetaLbl}>Humidité max</Text>
            </View>
          </View>

          {/* Lever / Coucher + UV */}
          <View style={styles.sunUvRow}>
            <View style={styles.sunItem}>
              <Text style={styles.sunIcon}>🌅</Text>
              <Text style={styles.sunVal}>{fmtTime(day.sunrise)}</Text>
              <Text style={styles.sunLbl}>Lever</Text>
            </View>
            <View style={styles.sunItem}>
              <Text style={styles.sunIcon}>🌇</Text>
              <Text style={styles.sunVal}>{fmtTime(day.sunset)}</Text>
              <Text style={styles.sunLbl}>Coucher</Text>
            </View>
            <View style={styles.sunItem}>
              <Text style={styles.sunIcon}>☀️</Text>
              <Text style={[styles.sunVal, { color: uv.color }]}>{uv.text}</Text>
              <Text style={styles.sunLbl}>UV max</Text>
            </View>
            <View style={styles.sunItem}>
              <Text style={styles.sunIcon}>🌬️</Text>
              <Text style={styles.sunVal}>{windDir(day.windDirDominant)}</Text>
              <Text style={styles.sunLbl}>Dir. vent</Text>
            </View>
          </View>
        </View>

        {/* ── Tableau horaire ── */}
        <Text style={styles.sectionTitle}>Détail par créneaux</Text>

        {/* en-tête */}
        <View style={[styles.tRow, styles.tHead]}>
          <View style={styles.tLabel} />
          {SLOT_LBL.map(l => (
            <View key={l} style={styles.tCol}>
              <Text style={styles.tHeadTxt}>{l}</Text>
            </View>
          ))}
        </View>

        {/* icône + temp */}
        <TRow label="">
          {slots.map((s, i) => (
            <TCol key={i}>
              <Text style={styles.slotIcon}>{weatherEmoji(s.weathercode)}</Text>
              <Text style={styles.slotTemp}>{s.temperature != null ? `${Math.round(s.temperature)}°` : '--'}</Text>
            </TCol>
          ))}
        </TRow>

        <TRow label="Ressenti" alt>
          {slots.map((s, i) => <TCol key={i}><Text style={styles.slotVal}>{s.feelsLike != null ? `${Math.round(s.feelsLike)}°` : '--'}</Text></TCol>)}
        </TRow>

        <TRow label={'Vent\nkm/h'}>
          {slots.map((s, i) => (
            <TCol key={i}>
              <Text style={styles.slotVal}>{s.windSpeed != null ? Math.round(s.windSpeed) : '--'}</Text>
              <Text style={styles.slotMeta}>{windDir(s.windDirection)}</Text>
            </TCol>
          ))}
        </TRow>

        <TRow label="Rafales" alt>
          {slots.map((s, i) => <TCol key={i}><Text style={styles.slotVal}>{s.windGusts != null ? Math.round(s.windGusts) : '--'}</Text></TCol>)}
        </TRow>

        <TRow label="Humidité">
          {slots.map((s, i) => <TCol key={i}><Text style={styles.slotVal}>{s.humidity != null ? `${s.humidity}%` : '--'}</Text></TCol>)}
        </TRow>

        <TRow label={'Pression\nhPa'} alt>
          {slots.map((s, i) => <TCol key={i}><Text style={styles.slotVal}>{s.pressure != null ? Math.round(s.pressure) : '--'}</Text></TCol>)}
        </TRow>

        <TRow label={'Précip.\nmm'}>
          {slots.map((s, i) => (
            <TCol key={i}>
              <Text style={[styles.slotVal, { color: (s.precipitation || 0) >= 0.1 ? '#5ac8fa' : '#555' }]}>
                {s.precipitation != null ? s.precipitation.toFixed(1) : '0.0'}
              </Text>
            </TCol>
          ))}
        </TRow>

        <TRow label={'Proba\npluie'} alt>
          {slots.map((s, i) => (
            <TCol key={i}>
              <Text style={[styles.slotVal, { color: (s.rainProba || 0) >= 40 ? '#5ac8fa' : '#555' }]}>
                {s.rainProba != null ? `${s.rainProba}%` : '--'}
              </Text>
            </TCol>
          ))}
        </TRow>

        <TRow label="UV">
          {slots.map((s, i) => {
            const u = uvLabel(s.uvIndex);
            return <TCol key={i}><Text style={[styles.slotVal, { color: u.color }]}>{u.text}</Text></TCol>;
          })}
        </TRow>

      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Prévisions 10 jours</Text>
          <Text style={styles.headerCity} numberOfLines={1}>{city}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>
      {renderContent()}
    </View>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 55, paddingBottom: 16, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn:      { width: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow:    { color: '#fff', fontSize: 32, lineHeight: 36 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerCity:   { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 },

  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { color: 'rgba(255,255,255,0.7)', marginTop: 12, fontSize: 14 },
  errorText:   { color: '#ff6b6b', fontSize: 15, textAlign: 'center' },
  retryBtn:    { marginTop: 16, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryText:   { color: '#fff', fontWeight: '600' },

  // strip 10 jours
  dayStrip:        { maxHeight: 130, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  dayStripContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  dayCard: {
    alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)',
    minWidth: 68, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  dayCardActive:      { backgroundColor: 'rgba(33,150,243,0.3)', borderColor: '#2196F3' },
  dayCardRain:        { borderColor: 'rgba(33,150,243,0.3)' },
  dayCardLabel:       { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600' },
  dayCardLabelActive: { color: '#fff' },
  dayCardEmoji:       { fontSize: 20, marginVertical: 3 },
  dayCardMax:         { color: '#ff9f0a', fontSize: 13, fontWeight: '700' },
  dayCardMin:         { color: '#5ac8fa', fontSize: 11 },
  dayCardRainTxt:     { color: '#5ac8fa', fontSize: 10, marginTop: 2 },
  dayCardSunTxt:      { color: '#ffd600', fontSize: 10, marginTop: 2 },
  dayCardProba:       { color: 'rgba(33,150,243,0.9)', fontSize: 10, fontWeight: '700' },

  // résumé du jour
  daySummary: {
    margin: 12, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  daySummaryTop:   { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  daySummaryEmoji: { fontSize: 52 },
  daySummaryDate:  { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4, textTransform: 'capitalize' },
  daySummaryTemps: { fontSize: 16 },
  daySummaryMax:   { color: '#ff9f0a', fontWeight: '700', fontSize: 22 },
  daySummaryMin:   { color: '#5ac8fa', fontWeight: '600', fontSize: 18 },

  dayMetaRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dayMetaItem: { alignItems: 'center', flex: 1 },
  dayMetaIcon: { fontSize: 18, marginBottom: 3 },
  dayMetaVal:  { color: '#fff', fontSize: 12, fontWeight: '700' },
  dayMetaLbl:  { color: 'rgba(255,255,255,0.45)', fontSize: 9, marginTop: 1, textAlign: 'center' },

  sunUvRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  sunItem:   { alignItems: 'center', flex: 1 },
  sunIcon:   { fontSize: 18, marginBottom: 3 },
  sunVal:    { color: '#fff', fontSize: 11, fontWeight: '700' },
  sunLbl:    { color: 'rgba(255,255,255,0.45)', fontSize: 9, marginTop: 1 },

  // section title
  sectionTitle: {
    color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700',
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    letterSpacing: 0.3,
  },

  // tableau
  tHead: { borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.15)' },
  tRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tRowAlt:   { backgroundColor: 'rgba(255,255,255,0.07)' },
  tLabel:    { width: 64 },
  tLabelTxt: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.5)', lineHeight: 14 },
  tCol:      { flex: 1, alignItems: 'center' },
  tHeadTxt:  { fontSize: 10, fontWeight: '700', color: '#5ac8fa', textAlign: 'center' },

  slotIcon: { fontSize: 20 },
  slotTemp: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 2 },
  slotVal:  { fontSize: 12, fontWeight: '600', color: '#ccc' },
  slotMeta: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
});
