import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

// Configuration par défaut
const DEFAULT_CONFIG = {
  baseURL: 'http://100.65.155.98:3000',
  endpoint: '/api/geo/nearest',
  pollInterval: 300000, // 5 minutes par défaut
  initialPoll: true,
  enableSmartPolling: true,
  retryCount: 3,
  retryDelay: 1000,
  timeout: 10000,
};

/**
 * Hook personnalisé pour les données météo en temps réel avec polling
 */
export const useLiveWeatherData = (lat, lon, config = {}) => {
  // Fusionner la config avec les valeurs par défaut
  const {
    baseURL,
    endpoint,
    pollInterval,
    initialPoll,
    enableSmartPolling,
    retryCount,
    retryDelay,
    timeout,
  } = { ...DEFAULT_CONFIG, ...config };

  // États
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // Références
  const pollIntervalRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const isMounted = useRef(true);
  const apiClient = useRef(null);
  const unsubscribeNetInfo = useRef(null);

  // Initialiser le client axios
  useEffect(() => {
    apiClient.current = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

    return () => {
      if (apiClient.current) {
        // Annuler les requêtes en cours si besoin
      }
    };
  }, [baseURL, timeout]);

  // Surveiller la connectivité (version React Native)
  useEffect(() => {
    const handleConnectivityChange = (state) => {
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(online);
      
      if (online && isMounted.current && !pollIntervalRef.current) {
        fetchData(); // Relancer le polling quand on revient en ligne
        startPolling();
      }
    };

    // S'abonner aux changements de connectivité
    unsubscribeNetInfo.current = NetInfo.addEventListener(handleConnectivityChange);

    // Vérifier l'état initial
    NetInfo.fetch().then(handleConnectivityChange);

    return () => {
      if (unsubscribeNetInfo.current) {
        unsubscribeNetInfo.current();
      }
    };
  }, []);

  /**
   * Calculer l'intervalle de polling intelligent
   */
  const calculateSmartInterval = useCallback((currentData) => {
    const now = new Date();
    const hour = now.getHours();
    
    // Vérifier l'âge des données
    if (currentData?.timestamp) {
      const dataTime = new Date(currentData.timestamp);
      const ageInMinutes = (now - dataTime) / (1000 * 60);
      
      // Si données trop vieilles, polling plus fréquent
      if (ageInMinutes > 10) return 60000; // 1 minute
      if (ageInMinutes > 5) return 120000; // 2 minutes
    }

    // Basé sur l'heure de la journée
    if (hour >= 6 && hour <= 9) return 120000; // 2 minutes (matin)
    if (hour >= 16 && hour <= 19) return 120000; // 2 minutes (soir)
    if (hour >= 10 && hour <= 17) return 180000; // 3 minutes (journée)
    
    return 300000; // 5 minutes (nuit)
  }, []);

  /**
   * Fonction principale de récupération des données
   */
  const fetchData = useCallback(async (isRetry = false) => {
    if (!isMounted.current || !lat || !lon || !isOnline) return;

    if (!isRetry) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await apiClient.current.get(endpoint, {
        params: {
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          _t: Date.now(), // Éviter le cache
        },
      });

      if (isMounted.current) {
        const newData = response.data;
        
        // Vérifier si les données ont réellement changé
        if (JSON.stringify(data) !== JSON.stringify(newData)) {
          setData(newData);
          setLastUpdated(new Date());
        }
        
        setRetryAttempt(0); // Réinitialiser les tentatives
        
        // Ajuster l'intervalle si smart polling est activé
        if (enableSmartPolling && pollIntervalRef.current) {
          const newInterval = calculateSmartInterval(newData);
          restartPolling(newInterval);
        }
      }
    } catch (err) {
      if (isMounted.current) {
        console.error('Erreur lors de la récupération:', err);
        
        if (!isRetry && retryAttempt < retryCount) {
          // Gestion des réessais avec backoff exponentiel
          const nextRetry = retryAttempt + 1;
          setRetryAttempt(nextRetry);
          
          const delay = retryDelay * Math.pow(2, nextRetry - 1);
          
          retryTimeoutRef.current = setTimeout(() => {
            fetchData(true);
          }, Math.min(delay, 30000)); // Max 30 secondes
        } else {
          setError({
            message: err.message,
            code: err.code,
            status: err.response?.status,
          });
        }
      }
    } finally {
      if (isMounted.current && !isRetry) {
        setLoading(false);
      }
    }
  }, [
    lat,
    lon,
    endpoint,
    data,
    retryAttempt,
    retryCount,
    retryDelay,
    enableSmartPolling,
    calculateSmartInterval,
    isOnline,
  ]);

  /**
   * Démarrer le polling
   */
  const startPolling = useCallback((customInterval = null) => {
    stopPolling(); // Arrêter tout polling existant
    
    const interval = customInterval || pollInterval;
    
    // Premier fetch immédiat
    fetchData();
    
    // Programmer les prochains polls
    pollIntervalRef.current = setInterval(() => {
      fetchData();
    }, interval);
    
    console.log(`Polling démarré avec intervalle: ${interval}ms`);
  }, [fetchData, pollInterval]);

  /**
   * Redémarrer le polling avec un nouvel intervalle
   */
  const restartPolling = useCallback((newInterval) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => {
        fetchData();
      }, newInterval);
    }
  }, [fetchData]);

  /**
   * Arrêter le polling
   */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    console.log('Polling arrêté');
  }, []);

  /**
   * Forcer un rafraîchissement immédiat
   */
  const refreshNow = useCallback(async () => {
    stopPolling(); // Arrêter temporairement le polling
    await fetchData();
    
    // Redémarrer le polling après le refresh manuel
    if (pollIntervalRef.current === null) {
      startPolling();
    }
    
    return data;
  }, [fetchData, startPolling, stopPolling, data]);

  /**
   * Changer l'intervalle de polling dynamiquement
   */
  const changePollInterval = useCallback((newInterval) => {
    if (newInterval < 60000) {
      console.warn('Intervalle trop court, minimum 60 secondes recommandé');
      return;
    }
    
    if (pollIntervalRef.current) {
      restartPolling(newInterval);
    }
  }, [restartPolling]);

  // Initialisation
  useEffect(() => {
    isMounted.current = true;
    
    if (initialPoll && lat && lon && isOnline) {
      startPolling();
    }
    
    return () => {
      isMounted.current = false;
      stopPolling();
      if (unsubscribeNetInfo.current) {
        unsubscribeNetInfo.current();
      }
    };
  }, [lat, lon, initialPoll, startPolling, stopPolling, isOnline]);

  // Redémarrer le polling quand les coordonnées changent
  useEffect(() => {
    if (lat && lon && pollIntervalRef.current) {
      stopPolling();
      startPolling();
    }
  }, [lat, lon, startPolling, stopPolling]);

  return {
    // États
    data,
    loading,
    error,
    lastUpdated,
    retryAttempt,
    isOnline,
    
    // Données extraites
    stationData: data?.station,
    weatherData: data?.data,
    rawData: data,
    
    // Méthodes de contrôle
    refreshNow,
    startPolling,
    stopPolling,
    changePollInterval,
    
    // Infos
    isPolling: !!pollIntervalRef.current,
    pollInterval: pollIntervalRef.current ? pollInterval : null,
  };
};

export default useLiveWeatherData;