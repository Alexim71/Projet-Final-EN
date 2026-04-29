import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { apiClient } from './api';

const { width: SW } = Dimensions.get('window');
const CHART_W = SW - 32;
const CHART_H = 160;
const PAD     = { l: 44, r: 12, t: 14, b: 28 };

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

function windLevel(kmh) {
  if (kmh < 12) return { label: 'Calme',    color: '#4caf50' };
  if (kmh < 29) return { label: 'Légère',   color: '#8bc34a' };
  if (kmh < 50) return { label: 'Modérée',  color: '#ff9800' };
  if (kmh < 75) return { label: 'Forte',    color: '#f44336' };
  return           { label: 'Violente', color: '#9c27b0' };
}

function humidityLevel(pct) {
  if (pct < 30) return { label: 'Très sec',     color: '#ff9800' };
  if (pct < 50) return { label: 'Sec',           color: '#8bc34a' };
  if (pct < 70) return { label: 'Confortable',   color: '#4caf50' };
  if (pct < 85) return { label: 'Humide',        color: '#2196f3' };
  return           { label: 'Très humide',   color: '#3f51b5' };
}

function pressureLevel(hpa) {
  if (hpa < 980)  return { label: 'Très basse — tempête probable', color: '#f44336' };
  if (hpa < 1000) return { label: 'Basse — temps perturbé',        color: '#ff9800' };
  if (hpa < 1013) return { label: 'Normale',                        color: '#4caf50' };
  if (hpa < 1025) return { label: 'Haute — beau temps',            color: '#2196f3' };
  return             { label: 'Très haute — beau temps stable',  color: '#1565c0' };
}

function uvLevel(idx) {
  if (idx <= 2)  return { label: 'Faible',    color: '#4caf50', conseil: 'Pas de protection particulière nécessaire.' };
  if (idx <= 5)  return { label: 'Modéré',    color: '#ff9800', conseil: 'Portez un chapeau et de la crème solaire SPF 30+.' };
  if (idx <= 7)  return { label: 'Élevé',     color: '#f44336', conseil: 'Évitez le soleil entre 12h et 16h. SPF 50+.' };
  if (idx <= 10) return { label: 'Très élevé',color: '#9c27b0', conseil: "Restez à l'ombre, protection maximale." };
  return            { label: 'Extrême',    color: '#7b1fa2', conseil: 'Évitez toute exposition extérieure.' };
}

function getRainAlert(hourly) {
  if (!hourly?.length) return null;
  const idx = hourly.slice(0, 24).findIndex(h => (h.precipitation || 0) >= 0.1);
  if (idx < 0)   return 'Aucune précipitation prévue dans les 24 prochaines heures';
  if (idx === 0) return 'Précipitations actuellement en cours';
  if (idx <= 2)  return `Pluie attendue dans ${idx} heure(s)`;
  return `Aucune précipitation dans les ${idx} prochaines heures`;
}

// ── Phase lunaire ─────────────────────────────────────────────────────────────
const LUNAR_CYCLE   = 29.530588853;
const KNOWN_NEW_MOON = new Date('2000-01-06T18:14:00Z');

function getMoonPhase(date = new Date()) {
  const elapsed  = (date - KNOWN_NEW_MOON) / 86400000;
  const cyclePos = ((elapsed % LUNAR_CYCLE) + LUNAR_CYCLE) % LUNAR_CYCLE;
  const illum    = Math.round(50 * (1 - Math.cos(2 * Math.PI * cyclePos / LUNAR_CYCLE)));
  let phase, emoji;
  if      (cyclePos <  1.85) { phase = 'Nouvelle Lune';       emoji = '🌑'; }
  else if (cyclePos <  7.38) { phase = 'Premier Croissant';   emoji = '🌒'; }
  else if (cyclePos <  9.22) { phase = 'Premier Quartier';    emoji = '🌓'; }
  else if (cyclePos < 14.77) { phase = 'Gibbeux Croissant';   emoji = '🌔'; }
  else if (cyclePos < 16.61) { phase = 'Pleine Lune';         emoji = '🌕'; }
  else if (cyclePos < 22.15) { phase = 'Gibbeux Décroissant'; emoji = '🌖'; }
  else if (cyclePos < 23.99) { phase = 'Dernier Quartier';    emoji = '🌗'; }
  else                        { phase = 'Dernier Croissant';  emoji = '🌘'; }
  const daysToFull = cyclePos < 14.77
    ? Math.ceil(14.77 - cyclePos)
    : Math.ceil(LUNAR_CYCLE - cyclePos + 14.77);
  const daysToNew  = Math.ceil(LUNAR_CYCLE - cyclePos);
  const nextPhaseDays = Math.ceil((Math.ceil(cyclePos / 7.38) * 7.38) - cyclePos);
  return { phase, emoji, illum, daysToFull, daysToNew, cyclePos, nextPhaseDays };
}

// Calcule l'illumination pour les 30 prochains jours (courbe lunaire)
function moonIllumCurve(days = 30) {
  const now = Date.now();
  return Array.from({ length: days }, (_, i) => {
    const d    = new Date(now + i * 86400000);
    const pos  = (((d - KNOWN_NEW_MOON) / 86400000) % LUNAR_CYCLE + LUNAR_CYCLE) % LUNAR_CYCLE;
    return Math.round(50 * (1 - Math.cos(2 * Math.PI * pos / LUNAR_CYCLE)));
  });
}

// ── graphique SVG ─────────────────────────────────────────────────────────────
function LineChart({ data1, data2, bars, title, unit, col1, col2, barCol, legend1, legend2 }) {
  const iW = CHART_W - PAD.l - PAD.r;
  const iH = CHART_H - PAD.t - PAD.b;
  const n  = Math.max(data1?.length || 0, data2?.length || 0, bars?.length || 0);
  if (n === 0) return null;

  const allVals = [...(data1 || []), ...(data2 || [])].filter(v => v != null);
  const minV  = allVals.length ? Math.min(...allVals) : 0;
  const maxV  = allVals.length ? Math.max(...allVals) : 1;
  const range = maxV - minV || 1;

  const tx = i => PAD.l + (n > 1 ? i / (n - 1) : 0.5) * iW;
  const ty = v => PAD.t + (1 - (v - minV) / range) * iH;
  const mkPath = arr => arr?.map((v, i) => v != null
    ? `${i === 0 ? 'M' : 'L'}${tx(i).toFixed(1)},${ty(v).toFixed(1)}`
    : '').join(' ');

  const gradId = `g_${(title || '').replace(/\W/g, '')}`;

  return (
    <View style={styles.chartBox}>
      <Text style={styles.chartTitle}>
        {title} <Text style={styles.chartUnit}>({unit})</Text>
      </Text>
      <Svg width={CHART_W} height={CHART_H}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={col1 || '#e53935'} stopOpacity="0.18" />
            <Stop offset="1" stopColor={col1 || '#e53935'} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <Line key={i} x1={PAD.l} y1={PAD.t + t * iH}
            x2={CHART_W - PAD.r} y2={PAD.t + t * iH}
            stroke="rgba(0,0,0,0.06)" strokeWidth={1} />
        ))}
        <SvgText x={PAD.l - 4} y={PAD.t + 4}           textAnchor="end" fill="#999" fontSize="9">{maxV.toFixed(0)}</SvgText>
        <SvgText x={PAD.l - 4} y={PAD.t + iH / 2 + 4}  textAnchor="end" fill="#999" fontSize="9">{((maxV + minV) / 2).toFixed(0)}</SvgText>
        <SvgText x={PAD.l - 4} y={PAD.t + iH + 4}       textAnchor="end" fill="#999" fontSize="9">{minV.toFixed(0)}</SvgText>
        {bars?.map((v, i) => {
          if (!v || v < 0.1) return null;
          const bH = Math.min(v / 20, 1) * iH * 0.45;
          return <Rect key={i} x={tx(i) - 5} y={PAD.t + iH - bH} width={10} height={bH} fill={barCol || 'rgba(76,175,80,0.5)'} rx={2} />;
        })}
        {data1 && (
          <Path
            d={`${mkPath(data1)} L${tx(n-1).toFixed(1)},${(PAD.t+iH).toFixed(1)} L${PAD.l.toFixed(1)},${(PAD.t+iH).toFixed(1)} Z`}
            fill={`url(#${gradId})`}
          />
        )}
        {data1 && <Path d={mkPath(data1)} stroke={col1 || '#e53935'} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        {data2 && <Path d={mkPath(data2)} stroke={col2 || '#1e88e5'} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        {data1?.map((v, i) => v != null && <Circle key={`a${i}`} cx={tx(i)} cy={ty(v)} r={3.5} fill={col1 || '#e53935'} />)}
        {data2?.map((v, i) => v != null && <Circle key={`b${i}`} cx={tx(i)} cy={ty(v)} r={3.5} fill={col2 || '#1e88e5'} />)}
        {Array.from({ length: n }).map((_, i) => (
          <SvgText key={i} x={tx(i)} y={CHART_H - 6} textAnchor="middle" fill="#bbb" fontSize="9">{i + 1}</SvgText>
        ))}
      </Svg>
      {(legend1 || legend2) && (
        <View style={styles.chartLegend}>
          {legend1 && <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: col1 || '#e53935' }]} /><Text style={styles.legendText}>{legend1}</Text></View>}
          {legend2 && <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: col2 || '#1e88e5' }]} /><Text style={styles.legendText}>{legend2}</Text></View>}
        </View>
      )}
    </View>
  );
}

// ── composant principal ───────────────────────────────────────────────────────
export default function CardDetail() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const cardId = parseInt(params.cardId) || 1;
  const lat    = parseFloat(params.lat);
  const lon    = parseFloat(params.lon);

  let weather = null;
  let station = null;
  try { weather = params.weatherData ? JSON.parse(params.weatherData) : null; } catch (_) {}
  try { station = params.stationData ? JSON.parse(params.stationData) : null; } catch (_) {}

  const [forecast,    setForecast]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);

  useEffect(() => { fetchForecast(); }, []);

  const fetchForecast = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/geo/forecast', { params: { lat, lon } });
      setForecast(res.data);
    } catch (e) {
      console.error('[CardDetail]', e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── graphique unique par carte ────────────────────────────────────────────
  const renderChart = () => {
    // La carte Lune n'a pas besoin du forecast API
    if (cardId === 9) {
      return (
        <LineChart data1={moonIllumCurve(30)}
          title="Illumination lunaire (30 jours)" unit="%"
          col1="#cfd8dc" legend1="Illumination" />
      );
    }
    if (!forecast) return null;
    const d = forecast.daily;
    switch (cardId) {
      case 1: return (
        <LineChart data1={d.map(x => x.windSpeedMax)} data2={d.map(x => x.windGustsMax)}
          title="Vent (7 jours)" unit="km/h" col1="#ff8f00" col2="#ff5722"
          legend1="Vitesse max" legend2="Rafales max" />
      );
      case 2: return (
        <LineChart data1={d.map(x => x.humidityMax)} bars={d.map(x => x.precipitation)}
          title="Humidité (7 jours)" unit="%" col1="#0288d1"
          barCol="rgba(76,175,80,0.5)" legend1="Humidité max" />
      );
      case 3: return (
        <LineChart data1={d.map(x => x.pressureMean)}
          title="Pression (7 jours)" unit="hPa" col1="#8e24aa" legend1="Pression moyenne" />
      );
      default: return (
        <LineChart data1={d.map(x => x.tempMax)} data2={d.map(x => x.tempMin)}
          bars={d.map(x => x.precipitation)}
          title="Température (7 jours)" unit="°C" col1="#e53935" col2="#1e88e5"
          legend1="Max" legend2="Min" />
      );
    }
  };

  // ── détails avec données réelles ──────────────────────────────────────────
  const renderDetails = () => {
    const today = forecast?.daily?.[0] ?? null;
    const w     = weather || {};

    const windKmh = (w.wind_speed || 0) * 3.6;
    const wLvl    = windLevel(windKmh);
    const hLvl    = humidityLevel(w.humidity || 0);
    const pLvl    = pressureLevel(w.pressure || 1013);
    const uLvl    = uvLevel(w.uv_index || 0);

    let sectionTitle = '';
    let conseil = '';
    let rows = [];

    switch (cardId) {
      case 1: {
        sectionTitle = '💨 Détails du vent';
        conseil = windKmh < 12
          ? 'Conditions calmes. Idéal pour toutes activités extérieures.'
          : windKmh < 50
          ? 'Vent modéré. Prudence pour les activités nautiques légères.'
          : 'Vent fort. Évitez les activités en plein air exposées.';
        rows = [
          { label: 'Vitesse actuelle',     value: `${windKmh.toFixed(1)} km/h` },
          { label: 'Direction',            value: `${windDir(w.wind_direction)} (${w.wind_direction ?? '--'}°)`, alt: true },
          { label: 'Rafales max (jour)',   value: today ? `${today.windGustsMax?.toFixed(0) ?? '--'} km/h` : '--' },
          { label: 'Vitesse max (jour)',   value: today ? `${today.windSpeedMax?.toFixed(0) ?? '--'} km/h` : '--', alt: true },
          { label: 'Niveau',              value: wLvl.label, vc: wLvl.color },
          { label: "Précip. aujourd'hui", value: today ? `${today.precipitation?.toFixed(1) ?? '0'} mm` : '--', alt: true },
        ];
        break;
      }
      case 2: {
        sectionTitle = "💧 Détails de l'humidité";
        conseil = (w.humidity || 0) < 40
          ? 'Air sec. Pensez à vous hydrater régulièrement.'
          : (w.humidity || 0) < 70
          ? "Niveau d'humidité confortable."
          : 'Air très humide. Risque de sensation de chaleur accrue.';
        rows = [
          { label: 'Humidité actuelle',    value: `${(w.humidity || 0).toFixed(1)}%` },
          { label: 'Point de rosée',       value: `${(w.dew_point || 0).toFixed(1)}°C`, alt: true },
          { label: 'Ressenti',             value: `${(w.feels_like || 0).toFixed(1)}°C` },
          { label: 'Humidité max (jour)',  value: today ? `${today.humidityMax?.toFixed(0) ?? '--'}%` : '--', alt: true },
          { label: 'Confort',              value: hLvl.label, vc: hLvl.color },
          { label: "Précip. aujourd'hui", value: today ? `${today.precipitation?.toFixed(1) ?? '0'} mm` : '--', alt: true },
        ];
        break;
      }
      case 3: {
        sectionTitle = '📊 Détails de la pression';
        conseil = (w.pressure || 1013) < 1000
          ? 'Pression basse : temps instable ou orageux possible.'
          : (w.pressure || 1013) > 1020
          ? 'Haute pression : beau temps stable attendu.'
          : 'Pression normale. Conditions météo stables.';
        const diffP   = today ? ((w.pressure || 1013) - (today.pressureMean || 1013)) : 0;
        const tendance = Math.abs(diffP) < 1 ? 'Stable'
          : diffP > 0 ? `↑ En hausse (+${diffP.toFixed(0)} hPa)`
          : `↓ En baisse (${diffP.toFixed(0)} hPa)`;
        rows = [
          { label: 'Pression actuelle',    value: `${(w.pressure || 0).toFixed(1)} hPa` },
          { label: 'Pression moy. (jour)', value: today ? `${today.pressureMean?.toFixed(1) ?? '--'} hPa` : '--', alt: true },
          { label: 'Tendance',             value: tendance },
          { label: 'Niveau',              value: pLvl.label, vc: pLvl.color, alt: true },
          { label: 'Visibilité',          value: `${(w.visibility || 0).toFixed(1)} km` },
          { label: "Précip. aujourd'hui", value: today ? `${today.precipitation?.toFixed(1) ?? '0'} mm` : '--', alt: true },
        ];
        break;
      }
      case 4: {
        sectionTitle = '☀️ Indice UV & Soleil';
        conseil = uLvl.conseil;
        rows = [
          { label: 'Indice UV actuel',  value: `${w.uv_index ?? '--'} — ${uLvl.label}`, vc: uLvl.color },
          { label: 'Radiation solaire', value: `${w.solar_radiation ?? '--'} W/m²`, alt: true },
          { label: 'Protection',        value: (w.uv_index || 0) <= 2 ? 'Non requise' : (w.uv_index || 0) <= 5 ? 'SPF 30+' : 'SPF 50+ obligatoire' },
          { label: 'Heure de pic UV',   value: '12h00 – 14h00', alt: true },
          { label: 'Météo du jour',     value: today ? `${weatherEmoji(today.weathercode)} Max ${today.tempMax?.toFixed(0) ?? '--'}°C` : '--' },
        ];
        break;
      }
      case 5: {
        sectionTitle = '🌡️ Température & Ressenti';
        const diff5 = (w.feels_like || 0) - (w.temperature || 0);
        conseil = Math.abs(diff5) < 1
          ? 'La température perçue correspond à la température réelle.'
          : diff5 < 0
          ? "Le vent ou l'humidité abaissent la température perçue."
          : "L'humidité élevée augmente la sensation de chaleur.";
        rows = [
          { label: 'Température réelle', value: `${(w.temperature || 0).toFixed(1)}°C` },
          { label: 'Ressenti',           value: `${(w.feels_like || 0).toFixed(1)}°C`, alt: true },
          { label: 'Différence',         value: `${diff5 >= 0 ? '+' : ''}${diff5.toFixed(1)}°C` },
          { label: 'Max du jour',        value: today ? `${today.tempMax?.toFixed(1) ?? '--'}°C` : '--', alt: true },
          { label: 'Min du jour',        value: today ? `${today.tempMin?.toFixed(1) ?? '--'}°C` : '--' },
          { label: 'Humidité',           value: `${(w.humidity || 0).toFixed(0)}%`, alt: true },
        ];
        break;
      }
      case 6: {
        sectionTitle = '💧 Point de rosée';
        const dp = w.dew_point || 0;
        conseil = dp < 10 ? 'Air sec et frais. Confort optimal.'
          : dp < 16 ? 'Point de rosée confortable.'
          : dp < 21 ? 'Air humide et collant. Hydratez-vous bien.'
          : 'Chaleur étouffante. Restez au frais.';
        rows = [
          { label: 'Point de rosée',     value: `${(w.dew_point || 0).toFixed(1)}°C` },
          { label: 'Humidité relative',  value: `${(w.humidity || 0).toFixed(1)}%`, alt: true },
          { label: 'Température réelle', value: `${(w.temperature || 0).toFixed(1)}°C` },
          { label: 'Ressenti',           value: `${(w.feels_like || 0).toFixed(1)}°C`, alt: true },
          { label: 'Confort',            value: hLvl.label, vc: hLvl.color },
        ];
        break;
      }
      case 7: {
        sectionTitle = '☀️ Radiation solaire';
        conseil = (w.solar_radiation || 0) < 100 ? 'Faible ensoleillement. Pas de risque UV.'
          : (w.solar_radiation || 0) < 400 ? 'Ensoleillement modéré.'
          : 'Fort ensoleillement. Protégez-vous du soleil.';
        rows = [
          { label: 'Radiation actuelle', value: `${w.solar_radiation ?? '--'} W/m²` },
          { label: 'Indice UV',          value: `${w.uv_index ?? '--'} — ${uLvl.label}`, vc: uLvl.color, alt: true },
          { label: 'Max temp. (jour)',   value: today ? `${today.tempMax?.toFixed(1) ?? '--'}°C` : '--' },
          { label: 'Min temp. (jour)',   value: today ? `${today.tempMin?.toFixed(1) ?? '--'}°C` : '--', alt: true },
          { label: 'Météo du jour',      value: today ? weatherEmoji(today.weathercode) : '--' },
        ];
        break;
      }
      case 9: {
        const moon = getMoonPhase();
        sectionTitle = '🌙 Informations lunaires';
        conseil = moon.illum > 80
          ? 'Pleine lune ou quasi-pleine : nuits très lumineuses.'
          : moon.illum < 20
          ? 'Nouvelle lune : nuits sombres, idéal pour observer les étoiles.'
          : 'Phase intermédiaire : visibilité nocturne modérée.';
        // Calcule les prochaines phases
        const phases = [
          { label: '🌕 Prochaine Pleine Lune', days: moon.daysToFull },
          { label: '🌑 Prochaine Nouvelle Lune', days: moon.daysToNew },
        ].sort((a, b) => a.days - b.days);
        // Prochaines phases dans l'ordre du cycle
        const nextPhaseDate = (daysAhead) => {
          const d = new Date(Date.now() + daysAhead * 86400000);
          return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        };
        rows = [
          { label: 'Phase actuelle',       value: `${moon.emoji}  ${moon.phase}` },
          { label: 'Illumination',         value: `${moon.illum}%`, alt: true },
          { label: 'Progression du cycle', value: `J+${Math.round(moon.cyclePos)} / 29.5` },
          { label: phases[0].label,        value: `dans ${phases[0].days} j (${nextPhaseDate(phases[0].days)})`, alt: true },
          { label: phases[1].label,        value: `dans ${phases[1].days} j (${nextPhaseDate(phases[1].days)})` },
          { label: 'Prochain Premier Qrt', value: (() => {
            const d = moon.cyclePos < 9.22
              ? Math.ceil(9.22 - moon.cyclePos)
              : Math.ceil(LUNAR_CYCLE - moon.cyclePos + 9.22);
            return `dans ${d} j (${nextPhaseDate(d)})`;
          })(), alt: true },
          { label: 'Prochain Dernier Qrt', value: (() => {
            const d = moon.cyclePos < 23.99
              ? Math.ceil(23.99 - moon.cyclePos)
              : Math.ceil(LUNAR_CYCLE - moon.cyclePos + 23.99);
            return `dans ${d} j (${nextPhaseDate(d)})`;
          })() },
        ];
        break;
      }
      default: {
        sectionTitle = '🔋 État de la station';
        conseil = (w.battery_level || 0) < 20
          ? 'Batterie faible. La station doit être rechargée prochainement.'
          : 'Station opérationnelle.';
        rows = [
          { label: 'Niveau de batterie', value: `${w.battery_level ?? '--'}%`, vc: (w.battery_level || 0) < 20 ? '#f44336' : '#4caf50' },
          { label: 'Signal',             value: `${w.signal_strength ?? '--'} dBm`, alt: true },
          { label: 'Statut',             value: w.device_status || 'UNKNOWN' },
          { label: 'Source données',     value: w.source || '--', alt: true },
          { label: 'Dernière mesure',    value: w.measured_at ? new Date(w.measured_at).toLocaleTimeString('fr-FR') : '--' },
        ];
        break;
      }
    }

    return (
      <View style={styles.detailsBox}>
        <Text style={styles.detailsSectionTitle}>{sectionTitle}</Text>
        {rows.map((r, i) => (
          <View key={i} style={[styles.detailRow, r.alt && styles.detailRowAlt]}>
            <Text style={styles.detailLabel}>{r.label}</Text>
            <Text style={[styles.detailValue, r.vc && { color: r.vc }]}>{r.value}</Text>
          </View>
        ))}
        {conseil !== '' && (
          <View style={styles.conseilBox}>
            <Text style={styles.conseilTitle}>💡 Conseil</Text>
            <Text style={styles.conseilText}>{conseil}</Text>
          </View>
        )}
      </View>
    );
  };

  // ── tableau de prévision ──────────────────────────────────────────────────
  const renderTableau = () => {
    if (!forecast) return null;

    const base  = selectedDay * 24;
    const slots = SLOTS.map(h => forecast.hourly[base + h] || {});

    const TRow = ({ label, alt, children }) => (
      <View style={[styles.tRow, alt && styles.tRowAlt]}>
        <View style={styles.tLabel}><Text style={styles.tLabelTxt} numberOfLines={2}>{label}</Text></View>
        {children}
      </View>
    );
    const TCol = ({ children }) => <View style={styles.tCol}>{children}</View>;

    return (
      <View style={styles.tableauBox}>
        <Text style={styles.tableauTitle}>📅 Prévisions du jour</Text>

        {/* onglets jours */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.dayTabs} contentContainerStyle={styles.dayTabsContent}>
          {forecast.daily.map((day, i) => {
            const dt    = new Date(day.date);
            const label = i === 0 ? 'Auj.' : i === 1 ? 'Dem.' : `${DAY_FR[dt.getDay()]}.${dt.getDate()}`;
            return (
              <TouchableOpacity key={i}
                style={[styles.dayTab, selectedDay === i && styles.dayTabActive]}
                onPress={() => setSelectedDay(i)}>
                <Text style={styles.dayTabEmoji}>{weatherEmoji(day.weathercode)}</Text>
                <Text style={[styles.dayTabTxt, selectedDay === i && styles.dayTabTxtActive]}>{label}</Text>
                <Text style={styles.dayTabTemp}>{day.tempMax != null ? `${Math.round(day.tempMax)}°` : '--'}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* en-tête colonnes */}
        <View style={[styles.tRow, { borderBottomWidth: 1.5, borderBottomColor: '#e0e0e0' }]}>
          <View style={styles.tLabel} />
          {SLOT_LBL.map(l => (
            <View key={l} style={styles.tCol}>
              <Text style={styles.tHeadTxt}>{l}</Text>
            </View>
          ))}
        </View>

        {/* icône + température */}
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
              <Text style={[styles.slotVal, { color: (s.precipitation || 0) >= 0.1 ? '#1e88e5' : '#aaa' }]}>
                {s.precipitation != null ? s.precipitation.toFixed(1) : '0.0'}
              </Text>
            </TCol>
          ))}
        </TRow>
      </View>
    );
  };

  // ── rendu principal ───────────────────────────────────────────────────────
  const stationName = station?.address || station?.code || params.cardTitle || 'Station météo';
  const location    = [station?.department, 'Haïti'].filter(Boolean).join(', ') || 'Haïti';
  const alert       = forecast ? getRainAlert(forecast.hourly) : null;

  return (
    <View style={styles.container}>
      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={2}>{alert || 'Prévisions météo'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* station */}
      <View style={styles.stationBar}>
        <View style={styles.stationLeft}>
          <Text style={styles.stationIcon}>📍</Text>
          <View>
            <Text style={styles.stationName}>{stationName}</Text>
            <Text style={styles.stationLoc}>{location}</Text>
          </View>
        </View>
      </View>

      {/* contenu */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingTxt}>Chargement des prévisions…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {renderChart()}
          {renderDetails()}
          {renderTableau()}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f8ff' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 54, paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: '#1565C0',
  },
  backBtn:     { width: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow:   { color: '#fff', fontSize: 32, lineHeight: 36 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 },

  stationBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e8e8e8',
  },
  stationLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stationIcon: { fontSize: 18, marginRight: 10 },
  stationName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  stationLoc:  { fontSize: 12, color: '#888', marginTop: 1 },

  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingTxt: { marginTop: 12, color: '#888', fontSize: 14 },

  scroll: { padding: 16 },

  // chart
  chartBox: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  chartTitle:  { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 8 },
  chartUnit:   { fontSize: 12, fontWeight: '400', color: '#999' },
  chartLegend: { flexDirection: 'row', marginTop: 8, gap: 16 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendText:  { fontSize: 11, color: '#555' },

  // details
  detailsBox: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  detailsSectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#1565C0',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e8e8e8', backgroundColor: '#f0f4ff',
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff',
  },
  detailRowAlt: { backgroundColor: '#fafafa' },
  detailLabel:  { fontSize: 13, color: '#555', flex: 1 },
  detailValue:  { fontSize: 13, fontWeight: '700', color: '#1a1a1a', textAlign: 'right' },
  conseilBox: {
    margin: 12, padding: 12, backgroundColor: '#e8f4fd',
    borderRadius: 10, borderLeftWidth: 3, borderLeftColor: '#1565C0',
  },
  conseilTitle: { fontSize: 12, fontWeight: '700', color: '#1565C0', marginBottom: 4 },
  conseilText:  { fontSize: 12, color: '#333', lineHeight: 18 },

  // tableau
  tableauBox: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  tableauTitle: {
    fontSize: 14, fontWeight: '700', color: '#1565C0',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#e8e8e8', backgroundColor: '#f0f4ff',
  },
  dayTabs:        { maxHeight: 76, borderBottomWidth: 1, borderBottomColor: '#e8e8e8' },
  dayTabsContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  dayTab: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 14, backgroundColor: '#f0f0f0', minWidth: 52,
  },
  dayTabActive:    { backgroundColor: '#1565C0' },
  dayTabEmoji:     { fontSize: 16 },
  dayTabTxt:       { fontSize: 11, fontWeight: '600', color: '#555', marginTop: 1 },
  dayTabTxtActive: { color: '#fff' },
  dayTabTemp:      { fontSize: 11, color: '#e53935', fontWeight: '700' },

  tRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff',
  },
  tRowAlt:   { backgroundColor: '#fafafa' },
  tLabel:    { width: 68 },
  tLabelTxt: { fontSize: 11, fontWeight: '600', color: '#555', lineHeight: 15 },
  tCol:      { flex: 1, alignItems: 'center' },
  tHeadTxt:  { fontSize: 11, fontWeight: '700', color: '#1565C0', textAlign: 'center' },

  slotIcon: { fontSize: 22 },
  slotTemp: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginTop: 2 },
  slotVal:  { fontSize: 13, fontWeight: '600', color: '#333' },
  slotMeta: { fontSize: 11, color: '#888', marginTop: 1 },
});
