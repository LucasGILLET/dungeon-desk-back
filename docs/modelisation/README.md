# Modélisation des données de jeu (SRD)

Le schéma est réparti par domaine dans [`prisma/schema/`](../../prisma/schema/) :

| Fichier | Contenu |
|---|---|
| `schema.prisma` | générateur, source de données, modèles applicatifs (`User`, `Npc`, `Character`) |
| `00-base.prisma` | langues, éditions et **conventions de modélisation** (en tête de fichier) |
| `01-referentiels.prisma` | caractéristiques, compétences, alignements, types de dégâts, écoles de magie, états, langues, maîtrises… |
| `02-equipement.prisma` | équipement, armes, armures, véhicules, paquetages |
| `03-choix.prisma` | structure générique des choix (maîtrises, équipement de départ, options de capacités) |
| `04-classes.prisma` | classes, table de progression, incantation, multiclassage, sous-classes, capacités |
| `07-sorts.prisma` | sorts |

La migration correspondante est `prisma/schema/migrations/20261015160000_add_srd_socle/`.

- Nommage, contraintes CHECK, JSONB, seed et API : [`conventions.md`](conventions.md)
- Schémas Zod des colonnes JSONB : [`src/srd/jsonb.ts`](../../src/srd/jsonb.ts)
- Domaines modélisés mais pas encore branchés (races, historiques et dons, monstres, personnage) : [`brouillons/`](brouillons/)

## Diagrammes

Liens mermaid.live (gratuits, sans compte, le schéma est contenu dans le lien) :

| Domaine | Tables |
|---|---|
| [Vue d'ensemble (sans traductions ni colonnes)](https://mermaid.live/view#pako:eNqVV01vozAQ_SuI8_YP5FYlu1KlVhuVqHtY9jA1bmLFYNaYVqjpf19_AXZsB_aUeOY9z3h4M5jPHLEK55ssx3xH4MihLpss2zXVlkLX_S5z_Vvmf5T5_pVQIoYCMY6zy-Xujn1mxZlQmm0ycHwPlUI_QnPs4SiRTCOn9SbrECetMDCzgcXsOXsjiOAGDQqmXAblh46BwwS-_-1JW-NGxAl4dF-htyDwkfFhgTXCFtihY5O1wMOwY0EDwoPA9ap0b_NRPN-Rtgd03rJGKJPKEJ2jwEv2C0PLmkKA6MKsdlDLJ3wY2ukh-fBq8hu867WJOCZZ-RZzoUr2oa0uaXLe5LX2b-Iw97xmPHGWAPyCTwRRnDq67Znx4NsTI0iJHSmr1Xr_iqKYzjoMTO_zA4PoZ7H721mnhWvXz1YQ1hj4ZYYbrRnnglRnDmPUl7d12VJ7AWVGehnLJYRbMTInH7e_vEw8RjujEt0dIa1t8VvUq0IkH43HjjwkblZub8SIDswQD5hzIM0NjjCIaxna4qvFnpMa-GCHqK_J2FCPk8IJGw1WwDtpjocTZx8rI_mMlWH8seyE8fSUJAR6ip9FABcyt1lsXqhgiiZJyWHh8B7xO6Z-AMceIIsWU1pQNuWkrTf2P8ArxVtG-7pZGEshOjKgEmm9AO1xJKVg0zRT-2MHudgCq5Mj6FSR10rMp4QaC1HjBcexFRiNM2-OGReOYl1VWZtioE79xjd76qkgepNnJSGOQxHGzpyireytmf7fXZaiLvbbJMKENH3UVDpPl16JA-hc5dgUv4ZzU7jKm-LRao0bLffUjFzxwvcJ7p3Rh4eZ7DnW2XdExG8Mtk5siTnWoJhL9wRHggr5ymfU6xB9q1fW9H19wsE7tv7YY1ML5x7pt4dzv0zB3Ttm_i3La8xrIJX6yPksc3GSvVDKRZlX-A2kWksJKuX3jzJKAIWB9WInj6173UAfn8v860vtBr1gxdAgaRa8x9LSt5W8ItivJ2v--geai8qB) | 42 |
| [Référentiels](https://mermaid.live/view#pako:eNqtV9uOmzAQ_RWL5-4P8BYlrbTabbVq0jekyrFnibW-UGPaoiT_XgMm2FwaSPLo8TnjOWPPDBwjoihEMYpAbxhONRaJRGi1Z5yZckuUBnSsLAgxaRCj6O2lWeZGM5laK4W_6MdLh8lUzgxTsrKc-852Gsuc42p_wm-1xB7jmaIv4ZFcEcxhbePu7-D9XsNvhtvjLxsSCwgMFHKiWRbEuf1gnC9VOxpq526e3ryCLhE6S8-Ks1QKsP4XaAJZCATmwIi3FkrjSuXQ9cz7bOF3aZy83THxGyxwCrsyW_B-e8R52ugF__AL_IpTRrbkoBRfKMJjzlMhOsLDZaw1YFPoWy7Dp84TQjzGXUoyXthH_82Z62h2oDVmcqEGx5oXvmnAt0TeJExJyq6cAQ1ieEYd-tDVzMS38Ie_n1cs08LW2F2SXCfTWLs-5jpvfZrHq1G5KjSBDqX-SNDPtDEYJiA3WGTNWwO6Mv2NIqPdRqBhXi65Q9-VSlNmzIK3GeAP0PnVNL9p9c4IA0nKR2TaHg_TE-4_U74-5VfBst7ACOxrm99U6TIcuZ6EeYnOOsLNJRd8K51OT0_qOPnJE_dET_GbT5ExdLPjw0L_LtHh_G-jGpvasT-de5PT8cZHYhyMvv68ctSJQRSHA2cwJRx7qv3HvTbvN2dHHem6cdddw1bZnjbW8GK_sQXd6KRq1mUdX5pJCDsFsNB3V-je3TZ-_XIMrzV4L2Pg4av53NbNOMErtwDdVtkVVleM_T7ixE_UZRzWXxjoMfz2K4yGn1QJe31d6Q0DvcaKPqFIgLYGWv30HJPIHMAWs10kEYV3XHCTWFBi_4cqowVwXKrCbJgGUvfLGvr6PYnOtTd7htqWkliz0QVYS9P93d-UM5__AefXk9Q) | 20 |
| [Équipement](https://mermaid.live/view#pako:eNqtVttO4zAQ_RUrz_ADfUPtIlWAVFHYfam0GuwhtYjtYI-Bbsu_r3OhsdP0wnYfczxzZjyXE68zbgRmI5ahnUjILaiFZuzHq5elQk1jIMyNXbF1BTMmNTEp2Oym-0QhSRo9Fey6RR1ZqfNwKPCjsyvBBsKt2edgnAcL2hVQER4K2XfbDV4YDgWOw-X6JxoU7iZw5gVRe8VeAtC5cePoShmvKTKpwLG3oRJ81cACuVRQsHeU-ZJunzqCJ69FgXP5B9OoCnJ8tEXE6oy3HDtP867RTttcSCp0BKpk3GKol7ii_oEvRXeQ1uWbDfmXRmwBgY5bWVax9k_IlFB9M5O6G_1JqdlnwF_GRtPhASiDVY9Ohix60KsHTZJWW_JfCKXRcwJyMXmc4ezm4ouiGY82ywgK9c97ZYJqAiYy7niDPaxK3O3AG1oXGlj0XLSxYe7uK_pr6uDC6DwCo5vMrCnR0nlaMMB32oi9Jz7_fc6iZp1wzyaZ3gCU_dxq4iurjD1jCGolAIc1z7gA5xr8yZgCQTMQwk3w484I-SzRdk4KPgbxUATUOS3vpJbKq5TNEUJBy4l0IN7CPEPeaeVPXEoeBOnEu3wJmysRRSxW1fejlhQvZ1ixsDqN-g3vPduYy0uzHjgYbX8texw3w47x3I2G_inpD6JPs8f9mFuiY_v9jmbf-vPD2cYCN2qF7ATDRt4GDDeJqu2kP9nK0Fe7UvNYpgaEpc1lvzyMdmSgL7QJRbrOo-3aHgvd9yuTcDsliVb82CBs0i06VMB1olngw9r-FkaB1M1KZhcsUxg0XIrq_bZeZLTEoHThY5EJfAZf0CIYLcLTrgKDQQEr42kiLfJa_GrT2_tF9lmzhRhmvtI8wGQ9BqR5GLQPwxb-_AsgM4fa) | 12 |
| [Choix](https://mermaid.live/view#pako:eNqVVctu4yAU_RXEuv2BbJNWqjpSqzZdlWrEwG2CaoOLYWEl-fcB_AD8SN1VwuGcy30czAkzxQFvEAa9E_SgaUkkQtujEgzQyf9HSEiDBEfPj-0SpC3Rl5A87rKjUjUk64LW9QNH948Rq-2_OThg90CN1TDaqqgGaZ4qI5QMWzdvaQqVUkVCdqstNXBQuhniXGIxe01lXVAfa6GurhDHTfKojRbygArFaAFb16vxDoeaaRFyHJ3YJv6bw9o6arEY7MFAeSWgiq2K4Lel0gjTJEdo9SmYAMmaERe-rahK1_QlfNLhH4fIdAvvm2q8ZUBrKmQ-rZ3kWx8NndXtrTr1Vtz0nvKc185KE070WOhcktV8uCHlydQC_RzpuRc9_W7ck8kRuSWTe3U-J8TUmJvBE0vsLr05Yp_5lB5ssxns4SXP0QN53pkic0pW9BVRYqIVfZqXjtq2OMhMPTPSxHzXhJlHvXDfWvOKZjBvatp3gsMvwR_9Ne0-E9QaDX-5Kp0G4t1OC1slSAtaI4gD-xV7mNUaVeqlNfzh-q4h95P4iYtvEC5BO4D75-xEsDlCCcQtCObwSW1hiCMR99J50BEK2ihrdkIDC1_cQP3zQvAlRHNnqNdGMgcbbcEhtuKuL9072cGX_787gD0) | 4 |
| [Classes, sous-classes et capacités de classe](https://mermaid.live/view#pako:eNq1WNtuozgYfhXE9cwL9K5qp6tRu1JUqr1ZVisH_plaY2zG2OlGad99bQPxOUDV3iTi938--YNT2bAWyquiBH6L0U-OupoWxS1tbwgahr_r0vzX5T_FSR8UBaaiwG2xu7eP0GKBGf3eFncTdRAc05_qsIX_LN8zFrcY7PMg943W_gAHICMZqOyKgUneOHzshQL_3o4EgTsYBOr6ouGABLTXIjyQfWsP3vSPCeKJIzoQpF29EIzxKA6FsAYRuFHJCk8o6sAjtDA0HPfajkc_h4v2Y7jWtR3HHeLH6z0mWBw3eKdpaJSqGsbhfGR1V-igrD89c_bysYp3nP3ADQbabPW4t5IphwXiQrn87bfEfQeKf5t2mOUC-m-JqFDx-NZM8220QGzDRnnqVHAH0OYHR4myrFpiuKeql50B6IEQSwycqvRpRdhi_IY7cNGofvD9HJSuIZgJtNddTWRHN-Zg7uZ4VH7B0RnmAyISno69M889G_A8HUlXVk6q4d0yqiSePJOiv7SP78ly5IIRpsIotJQWN8ofSYVPcrj2jBFA1Pyfyc5I6Go2aNBj4fo5V2B3_2VxcKey6eEKF67WDNwWafaGYyERuRntnj1ynamg2bhPkw2QULmuB4aReUsTqBVALi7sIO1b50LL-FvtT0kENryPejdxeMdSu1DSDlPcyc4cOQJElZSq_B3gD85k70dmXfqELV5Nq-EDIENoN9munwQa5jBWdmJ2H74fOnhuLDVjwoG4H0caH9uwvQnQl3t2p_Ikk_f-dPIB1Q3u0ZXXjOk9xP0L_jOB4xTwBvwYJu-jesF1Z8fB1EqtUtjuj8mX8K7laY-s7Af_tIq33vwOUby-fv3KTjEGv5oLnuUOYLEncO0sxMtC_urMGnNx8jpLvsRKM-6-9cy4B3kBb-nmY4kgtGfKkpeEHCydNTYiaM-AQ484Lay98oBVvmccjOpZOd8zryzHbddHEvJmzARdOoG8pcBGFBkHddGqL-lY8lPxmsCBK5vUF4m7NOaaxFM4z89_giEv6yf1DNzyPWzuu9hgkmm65VLK0uhrMXk5sZVjngZYqwY-J7o4-ud5yEyJzxXUwxuUnMw53T63W5aI1VbGQw_TzIbs0XWTzfCsaHklWM7EOgj8CQRmnBGzx54k7jYviiV570JfVsCWFCRTOdVqtXBly-dNycnDKkgKDv-2rEOY2lfX6APORe7Ei8hFfg8PZznLL0XZAVeEVn_lPNWleFajXKuHumzhB1LDViumugSuiYqBoCOT4lZFb1bUyPrwWJdvRpuywaojbRRZcAmKMsLG6fPpRH77H-qtW78) | 23 |
| [Sorts](https://mermaid.live/view#pako:eNqVVNuO0zAQ_RUrz-wP9K1qtWjFghApb5HQ1B5Sgy-RPS5b0v47jpuL3S6LeEvOOXNszxy7r7gVWK1YhW4roXWgG8NY3aFSrB8-GZOGmBTs84flF4Ukac2TYI8j6slJ00ZS4MuiU3hEtfx6frBWZVUDyMFTLN1JjWttg6ErhSbonPtq5MjsoweCYU5SAJWpHZgWd6cOF_MEPd4UHtHtp8IJ81YDSV6CEUInJ6lALjWoGd1YT--71ys21vigUWS7E8HB0LRygxOaH30y49ZwNHQVZE5ABPxn6ePhiOu9VJJOWX-TfKDqwDl6n5s4hNJiQGr5e27XD2_NngnQ0GLNQcVB5MQBE1Qw1_VscDzztb8MuqexFRRH6Ql0x3hcjlCs6ZYInViIyxzHXZylV6kXbyTTD9L7XCobt4mbmPVbxoDGAhDouZPd0vMRP8j2gO55SLQviGnmO3yhgsjS-8lSuUoK5oQuh9ymbg9z-Y8zphzNhTORXD9CK3md7h07nx8ebD9e7tV8GwfZGJ2aW4fsbEtdHq3ldcjd8tmspv29Ls1OWCgz_K_y_JB3u-6L_kIgh99EvNXSLD2-b--b8rx5_9JX71il0UVADM9p31R0wBit-NNUAr9DUNREURNf2gGMAgUnG2grHfKUtiR9_tJUl-QW17D1yfAIkwsYkevNGN_pEb78AeNm-Dc) | 3 |

Pour une vue complète avec groupes colorés et notes de colonnes : coller [`socle/diagrammes/socle.dbml`](socle/diagrammes/socle.dbml) dans [dbdiagram.io](https://dbdiagram.io/d) ou l'importer dans [drawdb.app](https://drawdb.app).

Les relations vers `Locale` (tables `*Translation`) et `Edition` (contenu de jeu) ne sont pas dessinées : elles partent de presque toutes les tables.

Après modification du schéma, régénérer le DBML et le tableau de liens ci-dessus :

```bash
python docs/modelisation/outils/prisma-vers-diagrammes.py prisma/schema docs/modelisation/socle/diagrammes
```

## Seed

Les données sources sont dans `prisma/data/2014/` (`en/`, `fr/`, `custom/`) : ce sont des copies des fichiers du front, limitées à ce que le seed importe. Les autres fichiers (races, monstres…) seront ajoutés avec leur importeur.

```bash
npx prisma db seed
```

Options (après `--`) : `--only base,referentiels,equipement,maitrises,sorts,classes` et `--classes wizard,fighter`. Le seed est idempotent : le relancer met les données à jour sans créer de doublons.

## API

```
GET /api/srd/:edition/classes?lang=fr
GET /api/srd/:edition/classes/:index?lang=fr
```

## Back-office (Directus)

Directus sert à éditer les données de jeu (et leurs traductions) depuis une interface web. Il ne crée ni ne modifie aucune table : la structure reste gérée par les migrations Prisma.

```bash
cp .env.directus.example .env.directus   # renseigner SECRET, ADMIN_PASSWORD (et ADMIN_TOKEN pour les scripts)
docker compose -f docker-compose.yml -f docker-compose.directus.yml up -d directus
```

Puis http://localhost:8055, avec `ADMIN_EMAIL` / `ADMIN_PASSWORD` de `.env.directus`.

**Cohabitation avec Prisma** : Directus range ses tables système (`directus_*`) dans le schéma PostgreSQL `directus` (`DB_SEARCH_PATH=directus,public`) et lit les tables du socle dans `public`. Prisma ne gère que `public` : il ne voit pas les tables de Directus, et `prisma migrate dev` ne signale aucune dérive. Sans ce schéma séparé, Prisma proposerait de supprimer les 33 tables de Directus.

Exigence de Directus : chaque table doit avoir une clé primaire simple (voir `conventions.md`).

**Configuration de l'interface** (menus, libellés français, formulaires en sections, listes liées, onglets de traduction) et **rôles** (« Éditeur des données de jeu », « Traducteur ») : appliqués par un script versionné, idempotent, à relancer après chaque migration :

```bash
npm run directus:config
```

Le script ([`src/directus/`](../../src/directus/)) lit le schéma Prisma et ne touche qu'à la présentation et aux droits, jamais à la structure des tables. Le snapshot Directus (`directus schema snapshot`) n'est volontairement pas utilisé : il contient aussi la structure des tables, et entrerait en concurrence avec les migrations Prisma.

**Licence** : Directus 12 limite l'offre gratuite à 25 collections. Le projet utilise l'Open Innovation Grant (gratuit pour les particuliers et petites structures, renouvelé chaque année) : renseigner `LICENSE_KEY` dans `.env.directus`. La clé est liée au `PUBLIC_URL` (5 activations au total) ; désactiver la licence dans Paramètres → Licence avant de détruire une instance. Sans licence, Directus verrouille le projet et désactive les collections au-delà de la limite (le script les réactive).

## Base locale

La base de développement est le service `postgres` de `docker-compose.yml` :

```bash
docker compose up -d postgres
npx prisma migrate deploy
npx prisma db seed
```

Sans Docker, [PGlite](https://pglite.dev) fournit un vrai PostgreSQL en WebAssembly :

```bash
npx @electric-sql/pglite-socket@0.2.11 --db=./.pglite --port=5433
```

puis lancer les commandes Prisma avec `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/postgres` et `SEED_POOL_SIZE=1` (PGlite ne gère qu'une session à la fois).
