# Documentation de développement avec Ngrok

## Prérequis

- Git
- Docker et Docker Compose
- Just (command runner)
- Un compte Ngrok avec un token d'authentification

## Installation et configuration

### 1. Mise à jour avec la branche principale

```bash
git checkout main
git pull origin main
```

### 2. Configuration de l'environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
NGROK_AUTHTOKEN=<votre_token_ngrok>
NGROK_DOMAIN=<votre_domaine_ngrok>
```

### 3. Création du domaine statique Ngrok

1. Connectez-vous à votre [dashboard Ngrok](https://dashboard.ngrok.com)
2. Naviguez dans la section "Domains"
3. Créez un nouveau domaine statique gratuit
4. Copiez le domaine généré et ajoutez-le dans votre fichier `.env`

### 4. Démarrage de l'environnement de développement

Lancez la commande suivante (si ce n'est pas déjà fait) :

```bash
just up dev
```

**En cas d'erreur liée à une bibliothèque manquante dans le backend** :

```bash
docker system prune -a
just up dev
```

⚠️ **Attention** : La commande `docker system prune -a` supprime tous les conteneurs, images et volumes non utilisés. Assurez-vous de ne pas avoir de données importantes avant de l'exécuter.

### 5. Activation de Ngrok

Démarrez le service Ngrok avec la commande suivante :

```bash
just up ngrok
```

## Vérification

Une fois toutes les étapes complétées, votre environnement de développement devrait être accessible via le domaine Ngrok configuré.

Pour vérifier les logs Ngrok :

```bash
docker compose logs ngrok
```