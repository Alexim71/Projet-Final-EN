// haiti-locations.js
const haitiLocations = {
  departments: [
    {
      id: 'ouest',
      name: 'Ouest',
      capital: 'Port-au-Prince',
      coordinates: { latitude: 18.533333, longitude: -72.333333 },
      area: 4827, // km²
      population: 4029705,
      communes: [
        { name: 'Port-au-Prince', coordinates: { latitude: 18.533333, longitude: -72.333333 }, type: 'commune' },
        { name: 'Carrefour', coordinates: { latitude: 18.534445, longitude: -72.409721 }, type: 'commune' },
        { name: 'Delmas', coordinates: { latitude: 18.548889, longitude: -72.298333 }, type: 'commune' },
        { name: 'Pétion-Ville', coordinates: { latitude: 18.5125, longitude: -72.285833 }, type: 'commune' },
        { name: 'Croix-des-Bouquets', coordinates: { latitude: 18.576667, longitude: -72.226944 }, type: 'commune' },
        { name: 'Gressier', coordinates: { latitude: 18.55, longitude: -72.516667 }, type: 'commune' },
        { name: 'Léogâne', coordinates: { latitude: 18.511111, longitude: -72.633889 }, type: 'commune' },
        { name: 'Tabarre', coordinates: { latitude: 18.583333, longitude: -72.266667 }, type: 'commune' },
      ]
    },
    {
      id: 'nord',
      name: 'Nord',
      capital: 'Cap-Haïtien',
      coordinates: { latitude: 19.759444, longitude: -72.198889 },
      area: 2106,
      population: 1067177,
      communes: [
        { name: 'Cap-Haïtien', coordinates: { latitude: 19.759444, longitude: -72.198889 }, type: 'commune' },
        { name: 'Limonade', coordinates: { latitude: 19.67, longitude: -72.125 }, type: 'commune' },
        { name: 'Quartier-Morin', coordinates: { latitude: 19.696944, longitude: -72.157222 }, type: 'commune' },
        { name: 'Grande-Rivière-du-Nord', coordinates: { latitude: 19.583333, longitude: -72.183333 }, type: 'commune' },
      ]
    },
    {
      id: 'nord-est',
      name: 'Nord-Est',
      capital: 'Fort-Liberté',
      coordinates: { latitude: 19.667778, longitude: -71.839722 },
      area: 1805,
      population: 393967,
      communes: [
        { name: 'Fort-Liberté', coordinates: { latitude: 19.667778, longitude: -71.839722 }, type: 'commune' },
        { name: 'Ferrier', coordinates: { latitude: 19.616667, longitude: -71.783333 }, type: 'commune' },
        { name: 'Ouanaminthe', coordinates: { latitude: 19.55, longitude: -71.733333 }, type: 'commune' },
        { name: 'Trou-du-Nord', coordinates: { latitude: 19.633333, longitude: -72.016667 }, type: 'commune' },
      ]
    },
    {
      id: 'nord-ouest',
      name: 'Nord-Ouest',
      capital: 'Port-de-Paix',
      coordinates: { latitude: 19.95, longitude: -72.833333 },
      area: 2176,
      population: 728807,
      communes: [
        { name: 'Port-de-Paix', coordinates: { latitude: 19.95, longitude: -72.833333 }, type: 'commune' },
        { name: 'Bassin-Bleu', coordinates: { latitude: 19.791667, longitude: -72.8 }, type: 'commune' },
        { name: 'Chansolme', coordinates: { latitude: 19.883333, longitude: -72.883333 }, type: 'commune' },
        { name: 'La Tortue', coordinates: { latitude: 20.033333, longitude: -72.783333 }, type: 'commune' },
      ]
    },
    {
      id: 'artibonite',
      name: 'Artibonite',
      capital: 'Gonaïves',
      coordinates: { latitude: 19.445556, longitude: -72.688889 },
      area: 4984,
      population: 1727524,
      communes: [
        { name: 'Gonaïves', coordinates: { latitude: 19.445556, longitude: -72.688889 }, type: 'commune' },
        { name: 'Ennery', coordinates: { latitude: 19.483333, longitude: -72.483333 }, type: 'commune' },
        { name: 'Gros-Morne', coordinates: { latitude: 19.666667, longitude: -72.683333 }, type: 'commune' },
        { name: 'Marmelade', coordinates: { latitude: 19.516667, longitude: -72.35 }, type: 'commune' },
      ]
    },
    {
      id: 'centre',
      name: 'Centre',
      capital: 'Hinche',
      coordinates: { latitude: 19.15, longitude: -72.016667 },
      area: 3487,
      population: 746236,
      communes: [
        { name: 'Hinche', coordinates: { latitude: 19.15, longitude: -72.016667 }, type: 'commune' },
        { name: 'Cerca-la-Source', coordinates: { latitude: 19.166667, longitude: -71.783333 }, type: 'commune' },
        { name: 'Maïssade', coordinates: { latitude: 19.166667, longitude: -72.133333 }, type: 'commune' },
        { name: 'Thomassique', coordinates: { latitude: 19.083333, longitude: -71.833333 }, type: 'commune' },
      ]
    },
    {
      id: 'sud-est',
      name: 'Sud-Est',
      capital: 'Jacmel',
      coordinates: { latitude: 18.234444, longitude: -72.535278 },
      area: 2023,
      population: 632601,
      communes: [
        { name: 'Jacmel', coordinates: { latitude: 18.234444, longitude: -72.535278 }, type: 'commune' },
        { name: 'Cayes-Jacmel', coordinates: { latitude: 18.230556, longitude: -72.395833 }, type: 'commune' },
        { name: 'Marigot', coordinates: { latitude: 18.233333, longitude: -72.316667 }, type: 'commune' },
        { name: 'Bainet', coordinates: { latitude: 18.183333, longitude: -72.75 }, type: 'commune' },
      ]
    },
    {
      id: 'sud',
      name: 'Sud',
      capital: 'Les Cayes',
      coordinates: { latitude: 18.2, longitude: -73.75 },
      area: 2794,
      population: 774976,
      communes: [
        { name: 'Les Cayes', coordinates: { latitude: 18.2, longitude: -73.75 }, type: 'commune' },
        { name: 'Aquin', coordinates: { latitude: 18.283333, longitude: -73.4 }, type: 'commune' },
        { name: 'Cavaillon', coordinates: { latitude: 18.3, longitude: -73.65 }, type: 'commune' },
        { name: 'Saint-Louis-du-Sud', coordinates: { latitude: 18.266667, longitude: -73.55 }, type: 'commune' },
      ]
    },
    {
      id: 'grand-anse',
      name: 'Grand\'Anse',
      capital: 'Jérémie',
      coordinates: { latitude: 18.65, longitude: -74.116667 },
      area: 3123,
      population: 468301,
      communes: [
        { name: 'Jérémie', coordinates: { latitude: 18.65, longitude: -74.116667 }, type: 'commune' },
        { name: 'Anse-d\'Hainault', coordinates: { latitude: 18.483333, longitude: -74.45 }, type: 'commune' },
        { name: 'Dame-Marie', coordinates: { latitude: 18.566667, longitude: -74.416667 }, type: 'commune' },
        { name: 'Les Irois', coordinates: { latitude: 18.4, longitude: -74.45 }, type: 'commune' },
      ]
    },
    {
      id: 'nippes',
      name: 'Nippes',
      capital: 'Miragoâne',
      coordinates: { latitude: 18.45, longitude: -73.1 },
      area: 1500,
      population: 342325,
      communes: [
        { name: 'Miragoâne', coordinates: { latitude: 18.45, longitude: -73.1 }, type: 'commune' },
        { name: 'Anse-à-Veau', coordinates: { latitude: 18.516667, longitude: -73.35 }, type: 'commune' },
        { name: 'Baradères', coordinates: { latitude: 18.483333, longitude: -73.633333 }, type: 'commune' },
        { name: 'Petit-Trou-de-Nippes', coordinates: { latitude: 18.533333, longitude: -73.5 }, type: 'commune' },
      ]
    }
  ],

  // Villes principales supplémentaires
  majorCities: [
    { name: 'Pétion-Ville', coordinates: { latitude: 18.5125, longitude: -72.285833 }, type: 'city' },
    { name: 'Carrefour', coordinates: { latitude: 18.534445, longitude: -72.409721 }, type: 'city' },
    { name: 'Delmas', coordinates: { latitude: 18.548889, longitude: -72.298333 }, type: 'city' },
    { name: 'Tabarre', coordinates: { latitude: 18.583333, longitude: -72.266667 }, type: 'city' },
    { name: 'Croix-des-Bouquets', coordinates: { latitude: 18.576667, longitude: -72.226944 }, type: 'city' },
    { name: 'Kenscoff', coordinates: { latitude: 18.45, longitude: -72.283333 }, type: 'city' },
    { name: 'Fonds-Parisien', coordinates: { latitude: 18.505833, longitude: -71.976389 }, type: 'city' },
    { name: 'Thomazeau', coordinates: { latitude: 18.65, longitude: -72.093056 }, type: 'city' },
  ]
};

// Fonction de recherche
export const searchHaitiLocation = (query) => {
  if (!query || typeof query !== 'string') {
    return { success: false, message: 'Requête invalide' };
  }

  const searchTerm = query.toLowerCase().trim();
  const results = [];
  
  // Rechercher dans les départements
  haitiLocations.departments.forEach(dept => {
    // Recherche par nom de département
    if (dept.name.toLowerCase().includes(searchTerm)) {
      results.push({
        name: dept.name,
        type: 'department',
        coordinates: dept.coordinates,
        details: {
          capital: dept.capital,
          area: dept.area,
          population: dept.population
        }
      });
    }
    
    // Recherche par capitale
    if (dept.capital.toLowerCase().includes(searchTerm)) {
      results.push({
        name: dept.capital,
        type: 'capital',
        coordinates: dept.coordinates,
        details: {
          department: dept.name,
          area: dept.area,
          population: dept.population
        }
      });
    }
    
    // Rechercher dans les communes du département
    dept.communes.forEach(commune => {
      if (commune.name.toLowerCase().includes(searchTerm)) {
        results.push({
          name: commune.name,
          type: 'commune',
          coordinates: commune.coordinates,
          details: {
            department: dept.name,
            capital: dept.capital
          }
        });
      }
    });
  });
  
  // Rechercher dans les villes principales
  haitiLocations.majorCities.forEach(city => {
    if (city.name.toLowerCase().includes(searchTerm) && 
        !results.some(r => r.name === city.name)) {
      results.push({
        name: city.name,
        type: 'city',
        coordinates: city.coordinates,
        details: {}
      });
    }
  });
  
  // Recherche avec accents et variantes
  const accentMap = {
    'a': ['à', 'á', 'â', 'ã', 'ä', 'å'],
    'c': ['ç'],
    'e': ['è', 'é', 'ê', 'ë'],
    'i': ['ì', 'í', 'î', 'ï'],
    'o': ['ò', 'ó', 'ô', 'õ', 'ö'],
    'u': ['ù', 'ú', 'û', 'ü'],
    'n': ['ñ']
  };
  
  // Si pas de résultats, essayer sans accents
  if (results.length === 0) {
    const normalizedSearch = searchTerm
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
    if (normalizedSearch !== searchTerm) {
      return searchHaitiLocation(normalizedSearch);
    }
  }
  
  // Trier par pertinence (exact match > partial match)
  results.sort((a, b) => {
    const aExact = a.name.toLowerCase() === searchTerm;
    const bExact = b.name.toLowerCase() === searchTerm;
    
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    
    // Même type, trier par longueur de nom (plus court = souvent plus pertinent)
    return a.name.length - b.name.length;
  });
  
  return {
    success: true,
    results: results,
    count: results.length,
    query: query
  };
};

// Fonction pour obtenir les suggestions de recherche
export const getSearchSuggestions = (partialQuery, limit = 5) => {
  if (!partialQuery || partialQuery.length < 2) {
    return [];
  }
  
  const query = partialQuery.toLowerCase().trim();
  const suggestions = new Set();
  
  // Collecter toutes les localités
  const allLocalities = [];
  
  haitiLocations.departments.forEach(dept => {
    allLocalities.push({ name: dept.name, type: 'department' });
    allLocalities.push({ name: dept.capital, type: 'capital' });
    dept.communes.forEach(commune => {
      allLocalities.push({ name: commune.name, type: 'commune' });
    });
  });
  
  haitiLocations.majorCities.forEach(city => {
    allLocalities.push({ name: city.name, type: 'city' });
  });
  
  // Filtrer et trier les suggestions
  const filtered = allLocalities.filter(loc => 
    loc.name.toLowerCase().includes(query)
  );
  
  // Trier par pertinence
  filtered.sort((a, b) => {
    const aStartsWith = a.name.toLowerCase().startsWith(query);
    const bStartsWith = b.name.toLowerCase().startsWith(query);
    
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    
    return a.name.length - b.name.length;
  });
  
  // Limiter et retourner
  return filtered.slice(0, limit).map(loc => ({
    name: loc.name,
    type: loc.type,
    display: `${loc.name} (${getTypeLabel(loc.type)})`
  }));
};

// Helper pour les labels de type
const getTypeLabel = (type) => {
  const labels = {
    'department': 'Département',
    'capital': 'Capitale',
    'commune': 'Commune',
    'city': 'Ville',
    'arrondissement': 'Arrondissement'
  };
  return labels[type] || type;
};

// Exporter les données
export const getAllDepartments = () => haitiLocations.departments;
export const getAllCommunes = () => {
  const communes = [];
  haitiLocations.departments.forEach(dept => {
    communes.push(...dept.communes.map(c => ({
      ...c,
      department: dept.name
    })));
  });
  return communes;
};

export default haitiLocations;