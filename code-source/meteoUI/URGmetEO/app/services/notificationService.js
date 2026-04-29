import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { SchedulableTriggerInputTypes } = Notifications;
const CACHE_KEY = 'notif_cache'; // { weather: {...}, location: { lat, lon, city } }

// ─── Permission ───────────────────────────────────────────────────────────────

export async function requestNotificationPermission() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('urgmeteo', {
        name: 'URGmetEO Météo',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#4facfe',
      });
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.log('[Notif] requestPermission error:', e);
    return false;
  }
}

export async function getNotificationPermissionStatus() {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch {
    return 'undetermined';
  }
}

// ─── Calcul des secondes jusqu'au prochain déclenchement ─────────────────────

/** Secondes jusqu'au prochain HH:MM quotidien */
function secondsUntilDaily(hour, minute) {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return Math.max(5, Math.floor((target.getTime() - now.getTime()) / 1000));
}

/** Secondes jusqu'au prochain déclenchement hebdomadaire
 *  weekday expo : 1=dim, 2=lun, 3=mar, 4=mer, 5=jeu, 6=ven, 7=sam
 */
function secondsUntilWeekly(expoWeekday, hour, minute) {
  const jsTarget = expoWeekday === 1 ? 0 : expoWeekday - 1; // expo→JS getDay()
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  let daysUntil = (jsTarget - now.getDay() + 7) % 7;
  if (daysUntil === 0 && target.getTime() <= now.getTime()) daysUntil = 7;
  target.setDate(target.getDate() + daysUntil);
  return Math.max(5, Math.floor((target.getTime() - now.getTime()) / 1000));
}

// ─── Cache (météo + localisation) ─────────────────────────────────────────────

async function saveCache(data) {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.log('[Notif] saveCache error:', e);
  }
}

async function loadCache() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// ─── Planification ────────────────────────────────────────────────────────────

/**
 * Annule toutes les notifications planifiées et replanifie.
 * @param {object} prefs          NotificationPrefs { enabled, hour, minute } par clé
 * @param {object|null} weather   { temp, city, condition }
 * @param {object|null} location  { lat, lon, city } pour le deep link forecastDetail
 */
export async function applyNotificationPrefs(prefs, weather = null, location = null) {
  // Mettre à jour le cache et lire les valeurs effectives
  const cache = await loadCache();
  if (weather)  cache.weather  = weather;
  if (location) cache.location = location;
  if (weather || location) await saveCache(cache);

  const effectiveWeather  = cache.weather  || null;
  const effectiveLocation = cache.location || null;

  console.log('[Notif] apply — weather:', effectiveWeather, '| location:', effectiveLocation);

  // Deep link data selon le type de notification
  const forecastLink = effectiveLocation
    ? {
        screen: 'forecastDetail',
        city: effectiveLocation.city || '',
        lat:  String(effectiveLocation.lat),
        lon:  String(effectiveLocation.lon),
      }
    : { screen: 'home' };

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('urgmeteo', {
        name: 'URGmetEO Météo',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#4facfe',
      });
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    // "28°C à Port-au-Prince — Ensoleillé"
    const infoLine = effectiveWeather
      ? [
          effectiveWeather.temp,
          effectiveWeather.city    ? `à ${effectiveWeather.city}`    : '',
          effectiveWeather.condition ? `— ${effectiveWeather.condition}` : '',
        ]
          .filter(Boolean)
          .join(' ')
      : null;

    const body = (action) => infoLine ? `${infoLine}\n${action}` : action;

    let scheduled = 0;

    if (prefs.forecastToday?.enabled) {
      const h = Number(prefs.forecastToday.hour);
      const m = Number(prefs.forecastToday.minute);
      console.log('[Notif] forecastToday h=%d m=%d', h, m);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌤️ Météo du jour',
          body:  body('Ouvrez URGmetEO pour plus de détails.'),
          data:  { screen: 'home' },
          ...(Platform.OS === 'android' ? { channelId: 'urgmeteo' } : {}),
        },
        trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntilDaily(h, m), repeats: false },
      });
      scheduled++;
    }

    if (prefs.forecastTomorrow?.enabled) {
      const h = Number(prefs.forecastTomorrow.hour);
      const m = Number(prefs.forecastTomorrow.minute);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📅 Prévisions de demain',
          body:  body('Consultez les prévisions pour demain dans URGmetEO.'),
          data:  forecastLink,
          ...(Platform.OS === 'android' ? { channelId: 'urgmeteo' } : {}),
        },
        trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntilDaily(h, m), repeats: false },
      });
      scheduled++;
    }

    if (prefs.forecastWeekend?.enabled) {
      const h = Number(prefs.forecastWeekend.hour);
      const m = Number(prefs.forecastWeekend.minute);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🏖️ Météo du week-end',
          body:  body('Préparez votre week-end avec URGmetEO.'),
          data:  forecastLink,
          ...(Platform.OS === 'android' ? { channelId: 'urgmeteo' } : {}),
        },
        trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntilWeekly(6, h, m), repeats: false },
      });
      scheduled++;
    }

    if (prefs.forecastWeek?.enabled) {
      const h = Number(prefs.forecastWeek.hour);
      const m = Number(prefs.forecastWeek.minute);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📆 Météo de la semaine',
          body:  body('Découvrez les prévisions pour toute la semaine.'),
          data:  forecastLink,
          ...(Platform.OS === 'android' ? { channelId: 'urgmeteo' } : {}),
        },
        trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntilWeekly(2, h, m), repeats: false },
      });
      scheduled++;
    }

    if (prefs.rainNearby?.enabled) {
      const h = Number(prefs.rainNearby.hour);
      const m = Number(prefs.rainNearby.minute);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌧️ Pluie à proximité',
          body:  body('Vérifiez les précipitations dans votre zone sur URGmetEO.'),
          data:  { screen: 'rainMap' },
          ...(Platform.OS === 'android' ? { channelId: 'urgmeteo' } : {}),
        },
        trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntilDaily(h, m), repeats: false },
      });
      scheduled++;
    }

    if (prefs.alerts?.enabled) {
      const h = Number(prefs.alerts.hour);
      const m = Number(prefs.alerts.minute);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Alertes météo',
          body:  body('Consultez les alertes cyclones et orages pour Haïti.'),
          data:  { screen: 'home' },
          ...(Platform.OS === 'android' ? { channelId: 'urgmeteo' } : {}),
        },
        trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntilDaily(h, m), repeats: false },
      });
      scheduled++;
    }

    console.log('[Notif] planification OK —', scheduled, 'notification(s) planifiée(s)');
  } catch (e) {
    console.log('[Notif] applyNotificationPrefs ERROR:', e);
    throw e;
  }
}

// ─── Utilitaire ───────────────────────────────────────────────────────────────

export async function getScheduledCount() {
  try {
    const list = await Notifications.getAllScheduledNotificationsAsync();
    return list.length;
  } catch {
    return 0;
  }
}

// ─── Test ─────────────────────────────────────────────────────────────────────

/** Test avec délai — si cette notification arrive, TIME_INTERVAL fonctionne */
export async function sendDelayedTestNotification(seconds = 30) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('urgmeteo', {
      name: 'URGmetEO Météo',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#4facfe',
    });
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⏱️ Test planifié (${seconds}s)`,
      body: `Cette notification était prévue ${seconds} secondes après avoir appuyé sur le bouton.`,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'urgmeteo' } : {}),
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
    },
  });
}

export async function sendTestNotification() {
  const cache = await loadCache();
  const w = cache.weather || null;
  const infoLine = w
    ? [w.temp, w.city ? `à ${w.city}` : '', w.condition ? `— ${w.condition}` : '']
        .filter(Boolean)
        .join(' ')
    : null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('urgmeteo', {
      name: 'URGmetEO Météo',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#4facfe',
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔔 Test URGmetEO',
      body:  infoLine
        ? `${infoLine}\nLes notifications fonctionnent correctement !`
        : 'Les notifications fonctionnent correctement !',
      data:  { screen: 'home' },
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'urgmeteo' } : {}),
    },
    trigger: null,
  });
}
