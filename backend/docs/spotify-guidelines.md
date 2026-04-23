# Spotify Integration Guidelines

Règles officielles (issues de la doc Spotify pour AI) à respecter quand on touche à l'intégration Spotify, côté `backend` comme `front-mobile`.

## OpenAPI spec

Toujours se référer au schéma OpenAPI officiel pour les endpoints, paramètres et schémas de réponse — ne jamais deviner un endpoint ou un nom de champ.

- Spec : https://developer.spotify.com/reference/web-api/open-api-schema.yaml

## Authorization flows

- **Avec un backend sécurisé (notre cas)** : utiliser le flow [Authorization Code](https://developer.spotify.com/documentation/web-api/tutorials/code-flow). Le `client_secret` vit côté backend uniquement.
- **Sans backend (non utilisé ici)** : utiliser [Authorization Code with PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow).
- **Client Credentials** : uniquement pour des données publiques non liées à un utilisateur.
- **Implicit Grant** : interdit (déprécié).

## Redirect URIs

- Toujours HTTPS, sauf `http://127.0.0.1` pour le dev local.
- Jamais `http://localhost` ni wildcards.
- Doc : https://developer.spotify.com/documentation/web-api/concepts/redirect_uri

## Scopes

Ne demander que le minimum nécessaire. Ne pas pré-demander de scopes « au cas où ».

Scopes actuellement utilisés (voir `config/ally.ts`) :

- `user-read-email`
- `user-top-read`
- `user-read-recently-played`

Doc : https://developer.spotify.com/documentation/web-api/concepts/scopes

## Token management

- `client_secret` **jamais** côté mobile — uniquement dans le backend (`.env`).
- `access_token` et `refresh_token` stockés chiffrés en base (voir `user_integration.ts`, colonnes `encryptedColumn`).
- Refresh automatique côté backend via `SpotifyService.getValidAccessToken()` — si Spotify omet un nouveau `refresh_token`, on garde l'ancien.
- Doc : https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens

## Rate limits

Sur HTTP 429 : respecter l'en-tête `Retry-After`, appliquer un backoff exponentiel. Pas de retry immédiat ni en boucle serrée.

## Deprecated endpoints

- Préférer `/playlists/{id}/items` à `/playlists/{id}/tracks`.
- Préférer `/me/library` aux endpoints de librairie par type.
- Ne pas consommer d'endpoint marqué déprécié dans la spec.

## Error handling

- Gérer tous les codes HTTP documentés dans la spec OpenAPI.
- Lire le message d'erreur renvoyé par Spotify et le propager au user quand c'est utile.
- Côté backend : log structuré (`logger.error({ err, ... })`), jamais juste `console.log`.

## Developer Terms of Service

- Ne **pas** cacher le contenu Spotify au-delà de l'usage immédiat.
- Toujours attribuer le contenu à Spotify (logo, nom, lien).
- Ne **pas** utiliser l'API pour entraîner un modèle ML sur des données Spotify.
- Doc : https://developer.spotify.com/terms
