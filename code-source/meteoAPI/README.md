# URGmetEO API

## Prérequis

- Node.js 20 LTS ou plus récent
- MongoDB accessible depuis le serveur
- Compte SMTP Gmail avec un mot de passe d'application si l'inscription par email est utilisée

## Configuration locale ou distante

Depuis ce dossier, copiez `.env.example` en `.env`, puis définissez :

- `MONGO_URI` : URI de la base MongoDB (ou `MONGODB_URI`)
- `JWT_SECRET` : secret aléatoire d'au moins 32 caractères
- `PORT` : port d'écoute (par défaut `3000`)
- `EMAIL_USER` et `EMAIL_PASS` : identifiants SMTP pour les codes de confirmation
- `SERVER_URL` : URL publique de l'API utilisée par Swagger
- `CORS_ORIGINS` : origines web autorisées, séparées par des virgules
- `TRUST_PROXY` : nombre de proxies de confiance devant l'API; laissez vide pour une connexion directe

Ne versionnez jamais `.env`. Dans l'hébergeur, configurez ces valeurs dans son gestionnaire de variables d'environnement. L'API refuse de démarrer si l'URI MongoDB ou le secret JWT est absent/invalide.

Si les anciens secrets du fichier `.env` ont été poussés vers un dépôt distant, remplacez immédiatement le mot de passe SMTP et le secret JWT. Son retrait du dernier état du dépôt ne les supprime pas de l'historique Git; toute réécriture de cet historique doit être coordonnée avec les autres contributeurs.

```sh
npm ci
npm start
```

Générez `JWT_SECRET` avec un générateur cryptographique (par exemple `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Si l'hébergeur place un reverse proxy devant Node, définissez `TRUST_PROXY` au nombre exact de proxies contrôlés afin que la limitation des tentatives utilise l'adresse IP client.

Le point de contrôle `GET /health` indique si l'API peut joindre MongoDB. Les écritures de mesures (`POST /api/data`) et de stations (`POST /api/stations`) nécessitent un jeton `Bearer` obtenu par connexion. Les inscriptions, confirmations et connexions sont limitées par adresse IP en mémoire; gardez une seule instance de l'API, ou remplacez ce limiteur par un stockage partagé avant de déployer plusieurs instances.

Pour que l'application mobile utilise le serveur hébergé, définissez `EXPO_PUBLIC_API_URL` à son URL HTTPS publique lors de la compilation Expo.

## Intégration de démonstration ESP32

Le backend fournit les routes `/api/iot/demo-state` et `/api/iot/measurements`
pour le prototype ESP32. Configurez `IOT_DEVICE_TOKEN` avec un secret aléatoire
propre à l'appareil et `IOT_STATION_CODE` avec le code d'une station existante.
Ne placez jamais ces valeurs dans le code mobile ni dans le dépôt. La route de
mesure utilise un en-tête `X-Device-Token` distinct du JWT des utilisateurs.

Un utilisateur mobile connecté peut publier le scénario de démonstration choisi
avec `POST /api/iot/demo-state`; l'ESP32 peut ensuite lire ce scénario avec
`GET /api/iot/demo-state`. Le modèle d'état est conservé dans la collection
MongoDB `iot_state`. La route `POST /api/iot/measurements` accepte les mesures
du dispositif et renvoie le niveau d'alerte ainsi que la couleur de LED. Le
sketch Arduino de démonstration et son câblage sont décrits dans
`code-source/esp32/URGmetEO_ESP32/README.md`.

Cette première version est conçue pour un seul appareil de test et utilise les
seuils par défaut de l'application (température, humidité, pression, pluie et
vent). Les autorisations par appareil, la gestion de plusieurs dispositifs et
l'ajout de capteurs autres que le BME280 nécessitent une extension avant une
utilisation à grande échelle.

## Migration des anciennes mesures

Avant le déploiement, faites une sauvegarde de MongoDB. Si les anciens documents de la collection `data` contiennent `deviceUUID`, `timestamp` et `windSpeed`, lancez une seule fois :

```sh
node scripts/migrate_legacy_data.js
```

Le script associe l'identifiant existant à `Station.uuid` ou `Station.code`, convertit les champs vers `station`, `measured_at` et `wind_speed`, et conserve les documents non associés en les signalant. Vérifiez le nombre de documents ignorés et faites correspondre leurs stations avant toute migration manuelle.

Les tests ciblés se lancent avec `npm test`.
