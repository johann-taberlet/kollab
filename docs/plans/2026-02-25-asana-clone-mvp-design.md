# Asana Clone MVP — Design Document

**Date:** 2026-02-25
**Scope:** MVP Collaboratif (Approche B)
**Stack:** Next.js v16 canary, Supabase, Tailwind CSS, shadcn/ui

---

## 1. Objectif

Outil de gestion de projet personnel pour un développeur solo invitant des clients. Centralise l'information, les échanges sur les features et les documents. Chaque utilisateur a une vue personnelle de ses tâches et notifications. L'accent est mis sur une UX ultra réactive.

---

## 2. Utilisateurs

- **Owner (développeur)** : crée les orgs, projets, invite les clients
- **Membres org** : clients avec accès à tous les projets d'une org
- **Membres projet** : clients avec accès à un seul projet, sans visibilité sur l'org

---

## 3. Modèle de données

```
profiles           (id, full_name, avatar_url, email)

organizations      (id, name, slug, logo_url, created_by, created_at)
org_members        (org_id, user_id, role: 'owner' | 'admin' | 'member')

projects           (id, org_id, name, description, color, created_by, created_at)
project_members    (project_id, user_id, role: 'editor' | 'viewer')

columns            (id, project_id, name, position)
tasks              (id, project_id, column_id, parent_task_id,
                    title, description, position,
                    assignee_id, created_by, due_date, completed_at)
task_labels        (task_id, label_id)
labels             (id, project_id, name, color)

custom_fields      (id, project_id, name, type: 'text' | 'select', options jsonb)
custom_field_values(task_id, field_id, value)

comments           (id, task_id, author_id, content, created_at)
attachments        (id, task_id, comment_id, uploaded_by,
                    file_name, file_path, created_at)

notifications      (id, user_id, type: 'mention' | 'assignment' | 'comment',
                    task_id, triggered_by, read_at, created_at)
```

**Points clés :**
- `position` integer sur colonnes et tâches pour le tri drag & drop, avec rebalancing
- Sous-tâches via `parent_task_id` nullable — un seul niveau de profondeur
- Mentions encodées dans le contenu des commentaires (`<mention user-id="uuid">Nom</mention>`)
- RLS Supabase sur toutes les tables : accès filtré par `org_members` et `project_members`
- Isolation stricte : un projet-only member ne voit que ce projet

---

## 4. Architecture

### Stack

| Couche | Technologie |
|---|---|
| Frontend & Backend | Next.js v16 canary (App Router) |
| Base de données | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email/password + magic link) |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage |
| Emails | Supabase Edge Functions + Resend |
| UI | Tailwind CSS + shadcn/ui |
| Drag & drop | @dnd-kit/core |
| Rich text | Tiptap |
| Déploiement | Docker + Oracle Cloud + Coolify |

### Structure du projet

```
asana-foss/
├── src/
│   ├── app/
│   │   ├── (auth)/            # login, signup, invite/[token]
│   │   └── (app)/
│   │       ├── [orgSlug]/
│   │       │   ├── page.tsx           # Dashboard org (liste projets)
│   │       │   ├── projects/[projectId]/
│   │       │   │   ├── page.tsx       # Vue Kanban
│   │       │   │   └── t/[taskId]/    # Détail tâche (panneau latéral)
│   │       │   └── settings/          # Paramètres org & membres
│   │       ├── my-tasks/              # Vue perso cross-org
│   │       └── inbox/                 # Notifications
│   ├── components/
│   ├── lib/
│   └── hooks/
├── supabase/
│   ├── migrations/
│   └── functions/             # Edge Functions (emails)
├── AGENTS.md                  # Pointe vers node_modules/next/dist/docs/
├── Dockerfile
└── docker-compose.yml
```

### Principe de réactivité

> **Important :** Les patterns précis d'optimisation (Server Components, caching, data fetching) seront déterminés pendant l'implémentation en consultant `node_modules/next/dist/docs/` (docs bundled Next.js v16) et la documentation Supabase à jour. Les connaissances d'entraînement sur ces versions ne sont pas fiables.

Principes directeurs :
- Updates optimistes systématiques sur les actions utilisateur
- Supabase Realtime pour la collaboration en temps réel
- Navigation instantanée avec prefetching
- Pas de spinners inutiles — l'UI répond avant la confirmation serveur

---

## 5. Pages & navigation

```
/login, /signup, /invite/[token]          Auth publique

/[orgSlug]                                Dashboard org (liste projets)
/[orgSlug]/projects/[projectId]           Vue Kanban
/[orgSlug]/projects/[projectId]/t/[taskId] Panneau détail tâche
/[orgSlug]/settings                       Paramètres org
/[orgSlug]/settings/members               Membres & invitations

/my-tasks                                 Mes tâches (cross-org)
/inbox                                    Notifications
```

- Le détail tâche s'ouvre en panneau latéral sans quitter le Kanban
- L'URL change pour permettre le partage de lien direct
- Les membres projet-only ne voient pas la sidebar org

---

## 6. Vue Kanban

**Carte (aperçu) :**
- Labels colorés, titre, date d'échéance, avatar assigné
- Compteurs : commentaires, pièces jointes, sous-tâches complétées

**Drag & drop :**
- Réordonner cartes dans une colonne
- Déplacer cartes entre colonnes
- Réordonner colonnes
- Feedback visuel : placeholder à l'emplacement cible, update optimiste

**Panneau de détail :**
- Titre éditable inline, description rich text (Tiptap)
- Assigné, date d'échéance, labels, champs personnalisés
- Sous-tâches (checkboxes, un seul niveau)
- Pièces jointes (drag & drop → Supabase Storage)
- Fil de commentaires avec @mentions
- Bouton "S'auto-assigner" → apparaît dans "Mes tâches"

---

## 7. Collaboration & notifications

**Commentaires :**
- Rich text Tiptap avec @mentions (dropdown membres filtré au fil de la frappe)
- Pièces jointes inline
- Édition/suppression de ses propres commentaires

**Événements déclencheurs :**

| Événement | In-app | Email |
|---|---|---|
| Assigné à une tâche | Oui | Oui |
| Mentionné dans un commentaire | Oui | Oui |
| Commentaire sur une tâche assignée | Oui | Oui |
| Commentaire sur une tâche où j'ai commenté | Oui | Non |

**Pipeline email :**
- Insert `notifications` → database webhook → Edge Function → Resend
- Opt-out possible par utilisateur
- Anti-spam : batching de 5 min pour éviter les doublons sur la même tâche

---

## 8. Organisations & permissions

**Rôles :**

| Niveau | Rôle | Droits |
|---|---|---|
| Org | `owner` | Tout, y compris suppression org |
| Org | `admin` | Gérer membres et projets |
| Org | `member` | Accès tous projets, créer tâches, commenter |
| Projet | `editor` | Créer/modifier tâches, commenter, uploader |
| Projet | `viewer` | Lecture + commenter |

**Invitation :**
- Par email depuis les paramètres org (rôle org) ou depuis un projet (rôle projet)
- Magic link Supabase Auth
- Création de compte automatique si premier accès

---

## 9. Contraintes techniques

- **Next.js v16 canary** : utiliser `create-next-app@canary`, consulter `node_modules/next/dist/docs/` pendant l'implémentation
- **Supabase** : suivre les best practices à jour (RLS, Edge Functions, Realtime)
- **Déploiement** : Docker sur Oracle Cloud via Coolify
- **AGENTS.md** : à créer à la racine, pointant vers les docs bundled Next.js

---

## 10. Hors scope MVP

- Vue Timeline / Gantt
- Dépendances entre tâches
- Formulaires d'intake
- Suivi du temps
- Multi-homing (tâche dans plusieurs projets)
- Objectifs / OKR
- Organisation de niveau entreprise (SAML, SCIM, etc.)
