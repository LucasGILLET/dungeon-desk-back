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
| `05-races.prisma` | races, sous-races, traits raciaux |
| `06-historiques-dons.prisma` | historiques (tables de personnalité comprises) et dons |
| `07-sorts.prisma` | sorts |

Migrations : `20261015160000_add_srd_socle` (socle), `20261016180000_add_srd_races_backgrounds` (races et historiques), `20261016190000_race_sizes_json`, `20261016200000_stats_own_primary_key`.

- Nommage, contraintes CHECK, JSONB, seed et API : [`conventions.md`](conventions.md)
- Schémas Zod des colonnes JSONB : [`src/srd/jsonb.ts`](../../src/srd/jsonb.ts)
- Domaines modélisés mais pas encore branchés (monstres, personnage) : [`brouillons/`](brouillons/)

## Diagrammes

Liens mermaid.live (gratuits, sans compte, le schéma est contenu dans le lien) :

| Domaine | Tables |
|---|---|
| [Vue d'ensemble (sans traductions ni colonnes)](https://mermaid.live/view#pako:eNqVWFFvozAM_iuI59sf6NuuvZMmbbpqVLuH4x6ykLXRgHAhbKrW_fdLSICYOJQ9Fezvix3Xjh0-UioKlm6SlMkdJ0dJqrxOkl1dbEvStn_ytP_N079GfPvMS67OGRWSJZfLzY34SLJXXpbJJiGe7q4w6HtSHzty1EjRI8f3TdJSyRtlYXYBh9lL8cIpZzU9G5hRWRQ0jYFDB37863hTsVrhBDaoZ-gtUewo5PkKa4BdYYeKTdIQGZodAhoQ7hSrVrm7zKe4vwNtT-jrVtTKiIyH9BUFXpLfjDSizhRRbejVjlT6Hz6cm_FPgvBi1Fu8r3WOeCId-YZJZUL23kt90qhc5DXuMbKZW1kJGdlLAH5iJ05LFtu6q5lh49uT4NQkOzVSl-vdM0UxrVNYWL_OT0ZUNyU7XM4pLfyR0BAmtXA0KjFEa-UWdJCEqwCijNQCvuuMOErR1UWAeh5Vzv1e8atRXNQWfJnANvet8krpTBwhSlhuTuX-emBQR6h_xXwJ4a44hOePX-_AE8BoJlTktEFIa4-cJeosENFUAewwabbSvvm1ihE9mMsUJnVW1AscZRF4F0DwpYPET3qEFB73WcOmRoIwWqOPZjvcwZT3U1m75DEve8krIs_OVVjjWJPESeEWUGMZeeP18XCS4n2lJchYaQa2Oc8MqIcoIagHfC-KSKV9m4oFmAq6UpQUPXw93j17YyU04MkDZJ8_WSlGn3rpwvoH8lyyrSi7qr5yzIdo5MCPuPVEyo4hLgWLxpm9HtvIxQXY7JyS1gR5bYpBSphjIWoYGD1Zxqg7s1tPupQ_fY3DYNuyR0Bewc8Xe-hKxftFHk0mSRbmIrb1GG1liU30LxdbjHq17MZcjGQoRI2hA-kJQhxApyhjzWgOlzZwBWhGaLSGha6X1oRcMUdBgj-KQ3joyV6y3vuWK3wQgx0ozhxikE2hszOctWmeXfZ9F3XXgmkOS0uEEGbk3IJ3HZtWn7o1CoSder6i7ar-cq7PhhCvwfqrDKMqOr4CyGy7YJZFr6koDRkiUGuD29jIjAK9_YFZY9D7aRfemQbU_LYELPYv8DDwrCLnCEIITg9_yresSQKp86EfMRijfskq1vzntoOxYZk-mx0W98xkK2pikmS8XsytL6GHy_VccVvyY-3c8e8ek3wNkwzPlmwOm4FnnmenzosWxQsEIYTV8UCOnGb6fiVK0M77TzpGGh_hRxx5G6oQay7mxSsI2MS9QonB_ZJJvyVpxWRFeGG-cH3kqTrpjp3rlzwt2AvRPTXXoDxl0gg1oCRn0amdPpz7wcRC7x_z9PPTrEY6JbJzTVNTax3Tkq4p9H3MfTpz4s__YU7u2A) | 58 |
| [Référentiels](https://mermaid.live/view#pako:eNqtV9uOmzAQ_RWL5-4P8BYlrbTabbVq0jekyrFnibW-UGPaoiT_XgMm2FwaSPLo8TnjOWPPDBwjoihEMYpAbxhONRaJRGi1Z5yZckuUBnSsLAgxaRCj6O2lWeZGM5laK4W_6MdLh8lUzgxTsrKc-852Gsuc42p_wm-1xB7jmaIv4ZFcEcxhbePu7-D9XsNvhtvjLxsSCwgMFHKiWRbEuf1gnC9VOxpq526e3ryCLhE6S8-Ks1QKsP4XaAJZCATmwIi3FkrjSuXQ9cz7bOF3aZy83THxGyxwCrsyW_B-e8R52ugF__AL_IpTRrbkoBRfKMJjzlMhOsLDZaw1YFPoWy7Dp84TQjzGXUoyXthH_82Z62h2oDVmcqEGx5oXvmnAt0TeJExJyq6cAQ1ieEYd-tDVzMS38Ie_n1cs08LW2F2SXCfTWLs-5jpvfZrHq1G5KjSBDqX-SNDPtDEYJiA3WGTNWwO6Mv2NIqPdRqBhXi65Q9-VSlNmzIK3GeAP0PnVNL9p9c4IA0nKR2TaHg_TE-4_U74-5VfBst7ACOxrm99U6TIcuZ6EeYnOOsLNJRd8K51OT0_qOPnJE_dET_GbT5ExdLPjw0L_LtHh_G-jGpvasT-de5PT8cZHYhyMvv68ctSJQRSHA2cwJRx7qv3HvTbvN2dHHem6cdddw1bZnjbW8GK_sQXd6KRq1mUdX5pJCDsFsNB3V-je3TZ-_XIMrzV4L2Pg4av53NbNOMErtwDdVtkVVleM_T7ixE_UZRzWXxjoMfz2K4yGn1QJe31d6Q0DvcaKPqFIgLYGWv30HJPIHMAWs10kEYV3XHCTWFBi_4cqowVwXKrCbJgGUvfLGvr6PYnOtTd7htqWkliz0QVYS9P93d-UM5__AefXk9Q) | 20 |
| [Équipement](https://mermaid.live/view#pako:eNqtVttO4zAQ_RUrz_ADfUPtIlWAhCjsvlRaDfGQWvgS7DG02_Lv61xoHDe9cHnM8cyZ8VxOvM5ywzEbsQztREBhQc01Y79evCgVahoDYWHsiq0rmDGhiQnObq-6T-SChNFTzi5b1JEVugiHHJedXQk2EG7N3gfj3FvQTkJFeChk6rYbXJocJI7D5dITDQp3E_jmBVF7xZ4D0LnlxtGFMl5TZFKBY29DJfJVA3PMhQLJ3lAUC7p-7AgeveYSZ-If9qMqKPDByojVGW9z7DzNm0Y7bXMhodARqJLlFkO9-AWlB77k3UG_Lp9syFcasQU4utyKsoq1f0KmhOqTmdTdSCelZr-F_HlsNB0egDJYJXQiZJFALx40CVptyf8glEbPCMidnPDZw1U8LW3SERTaUSRVg2ogJiIegAa7X5W425BXtC70UyYu2tgwhncV_SV1sDS6iMDoYrfWlGjpe9IwwHfaxL31fH587KLenXDPJplkHso0t5r4wipjf24map0AhzXtWIJzDf5ojETQDDh3E1zeGC6eBNrOScFyEA81QV3Q4kZoobzqszlCkLSYCAf8NUw7FJ2S_saFyINcfe1qHyroSkQeK1v1_aAFxZsc9jHsWSOVwyLBNub83KwHDkbb_9Aex82wYzyVo6EfUP9vktLscT_m1hO9_X5Hs2_988PZxmo4alXvBMNGCwcMNz0J3El_shWpj3b1zWMRG5CdNpf94jHaEYlUlXsU_WUfbZf6WOjUr-yF2ylJJADHBmHTX6pDBVz3FA182OK_3CgQutnQ7IxlCoPCC1499tbzjBYYdDB8zDOOT-AlzYPRPLwDKzAYSFgZTxNhMa-lsTa9vptn7zVbiGFmK50HmKzHgDSviPYV2cLv_wFyNJSg) | 12 |
| [Choix](https://mermaid.live/view#pako:eNqVls1u4yAQx18F-dy-QG5dZytVrbRVkz2tVyuCpw6qDS6Gg5Xk3RfwFxjbpafWw39gZpjfhEtCeA7JDiUg9hQXAlcZQyg9c0oAXcz_CFEmEc3R63P3CUxV6IOyfFolZ84bcL5L3DRPOXp8nmyNOi2Zre0RsFQCZksCEwg3WbBKgamc2U6YfBSCK5bPFmosgMlftaSc2aW7325iNeelI9ZfKZZQcNGO-9ymEh0FZk2JzV4r1erLQ72gGykoK1DJCS4h1TcwX8mhIYLaGGcndoF_57Auj4aubvYkodrYkE-lmoyfCjNJZesUnDPVOCcK_k4JBUbamSt8KlpX-g7W7EHBv-wUIjrzsa2D3gChu2MefolZoXAxF-MTLXVSB8KDI5oayjKi74gSwiT9UOnek05jDQvjFexZnpqU0JXf3_PLAN1uoMdoDj00gWaiyd6mU5rl7ca6GfmbRiiQdVz1h4olxQifER1N7oGkr4gR_BgBDFQum0FnW_F1Evu8GvnPeaMEB_jYOhPtenWELry7kZs1dR_eknCIPJRbtHYjQsbldQLDj9vz8PDxkt5wcsiKqNOy66xsq43leYctljpEbjl64Nq-6njd8BmJNvKXHuQN_cS6cXhwEN9w8ieBpcIMgA2PfkCssOFnMFHihXPxfgOwkgL-5bzSycI4NRysYuTDkPmTJfZvlvyN8vMuPsrBvfAYh6mhv6UeeznGa-yOGLELZozeTtEYYdc5Ucph3EeKRWwIA1VRWtu9XymTO5RUILQhN8_HS5bIM1SQ6Y8syeEdq1JmWpTpl6UxakGJW67kngog9i1ipS9vWXKzu-kz-KFlJDGAKNAWVef6tvt3aW--_Qe15azw) | 4 |
| [Classes, sous-classes et capacités de classe](https://mermaid.live/view#pako:eNq1WMtu1DAU_ZUoa_iB7qoWEKJIFSlsCEKe5NJaOHZw7IHRtP-O7STj9ySp2s2Mcn3fL5_kWDashfKiKIFfY3TPUVfTorim7RVBw_C9Ls1_Xf4ojvqgKDAVBW6L20_2EVosMKMf2-L9RB0Ex_ReHbbwz_I9YHGNwT4Pctdo7TewBzKSgcquGJjkjcPH_lLgH9uRIHAHg0BdXzQckID2UoQHsm_twZP-MUHccUQHgrSrZ4IxHsWhENYgAlcqWeEJRR14hBaGhuNe2_Hop3DRbgzXunbLcYf44XKHCRaHDd5pGhqlqoZxOB1Z3RXaK-t3D5z9fVnFt5z9wg0G2mz1uLeSKYcF4kK5_O6PxH0Hin-bdpjlAvofiahQ8fjWTPNttEBsw0Z56lRwe9DmB0eJsqxaYvhEVS87A9ADIZYYOFXp04qwxfgNd-CiUX3j-zkoXUMwE2inu5rIjm7MwdzN8aj8hoMzzHtEJNwdemeeezbgeTqSrqycVMO7ZVRJPHkmRd-0j8_JcuSCEabCKLSUFjfKH0mFT3K4dowRQNT8n8jOSOhqNmjQY7GqTm--Ls3xVEU9a-H-1YaA25rNznEsJCJXoxsnB13fKmgWijY43OFWCNsioXldZwwj85bWUIuBnF3jQTG2TouW8XfdZ0kENrxf9Mbi8IxVd6ayHaa4k505cgSIqixV-dvDB85k70dmXXqF3V5NC-MFgERoN9m1rwQl5jBWdmJ2Sz4fUHhuLDVjwoG4H0caH9uwvQowmXv2XuVJJtHAdPIC1Q1u15WXj-k9xP1r_zXh5BTwBlQZJu-lesF155aDqZVapbDdH5Mv4V3W0x5Z2Q_-aRVvvfnNonh8fPuWHWNkfjEXPMsdgGVP4NJZiOeF_NWZNeai53WWfImVZtx965lxD_IC3tLNxxIBa8-UJS8JOQg7a2zE1Z4Bhx5xWrB74cGtfM84yNWzcrpnHlmO266PJBDOmAm6dIJ-S4GN2DIO6qxVX9Kx5KfiMYEOVzapLxJ3acw1iafg3kUA63KwMK_Cz-0Jv-Vb2Vx7ft0NKcU0XXYpZWkQtpjDnNjKaU_jrFVznxNd3ACnscgMi88V1MObl5zMKd0-t1uWiNVWxgMR0-iG7NGtk83wrGh5M1jOxFYI_AkEZrgRs8eeJK44L4olee9eX1bAlhQkUznVarVwZcvnTcnRgyxICg4_W9YhTO17bfR15yx34n3kLL8Hi7Oc5Zui7IArQqs_gR7rUjyoUa7VQ1228AupYasVU10C10TFQNCBSXGtojcramS9-VKXT0abssGqA20UWXAJijKix-nb6kR--g9ZF2Xn) | 23 |
| [Races, sous-races et traits](https://mermaid.live/view#pako:eNq1Vslu2zAQ_RVC5-YHcnNrFAiaQxDnKCCgyYnKQiIFLmgUxf9eUis3uzKS3Kw3b7anmbH6gggKxS0qQO4ZriRuSo7QIyaAevcLIcY1YhQ9_FofgTLNBL-j6OeEKi0Zr6yRwuuI_FGCH5Fib6ACoAWgEwLcNEgJIwmsscVfDvKOjoBmDSiNmxYRCVgD3enYYFq6Gk5z8U8Sc1VjV-WFPqRlpk3UguAaflhdYgvHDQQAruAJXnWI1aziDXCdWJwYCVhjXhkvztLC7shqprvvghu1vQcH4dHzQISMTUcXLUhzP-W_LsVc9QL7yjN9XTDtXMJIB3OUH5_BTL4vmrmp3m1jp0byhyaPgiKStS5TXMTGwUmruGp21o4vvu58lswb_1-gre-7xdLuXpSP4satWNf6hYwHCZNZwy8bjqG1baMRCvNZgzEU8CDFCyMMOOmuKGCQdPVM9x29v9_ciD65urfT5uV4wYT6xJ03fRccwiHNZViumh99AfPE9aad6c3Opx9uRDKUScM4ynzT_BgzFlJCHZcVOu8Q6RN45DTNu6Wyni1v6DNIE6gRET1BJpoYaLN93llH2C-rGrP8JU4yJjuWy-pR_W0IqL7hvEOwEonKffhBYLSEZyoazDgsu-P1uYUe_01fJGdW_Sy_-IaKBqQFqPsM7MtC_wZ7U-xDWVB4wabWpSWV9gvRgZZQ404YvWcSxts5UO8fy-I0RLM5xKHjpHC6GrDIeBKn78sJPv0DbCaHfw) | 12 |
| [Historiques et dons](https://mermaid.live/view#pako:eNrNVttu2zAM_RXBz-sP5C1r1qHY0AbLHg0MqsRkQi3JpaWtgZt_H-W48UW-LXvZow95RIo8pFUmwkpIViwB3Ch-QK5Tw9hHLp4PaL2RrAzfjCnjmJJs-6X5BKmcsuZesrsaLRwqcyCjhNczAsZrVliPAhqi_W0A7-UZcEpD4bjOmUDgDuTa9Q0-l43h1M3vO3JTZDwkMpHq08U_zjazgmdwS2XoWwzX0AH2lKBHeBjBN1AIVHnIZSDTLdq9EgqMOP5tpsGQN_SLpRdh5zg6yufTi1e5BiJdEQfeyT38xXPjlDsO3QywsIZnZH3Mr-lEpZJnkk3rurZQnUJGQZZ13ubDGh3vuoNXNx51namDmaltFDOA_J3Y7d4dSef_nLGQ2bIaB_n_01zJgcEJ4bcIGPRIUoDl8atqP6nQs52wCD2TVkZprytTuz0O0NBNf8Fnkmc-IHP29nZzY8uR5bPqSHuO2V4GMbNtnaF21sJc1HhBxLEb2yJ6a13M3jlaE1M1i73rAycXweoyfNee1gx496wGX8JsTftlymtef65WtX6H_DoD0HZct_Q9QeiOQUQsO1PIvUP4Ia3mysBF_9HCm_SOfj2T3gO_xFH_5ANLNCABMjxXyjRxP4H2CH2kiYQ995lLySmll0wAySHjR-vdRiGIarVUrl-_pcmpOo1i2N3RCIIdeiDkvATrd1ANn_4AbBIthQ) | 10 |
| [Sorts](https://mermaid.live/view#pako:eNqVVNuO0zAQ_RUrz-wP9K1qtWjFghApb5HQ1B5Sgy-RPS5b0v47jpuL3S6LeEvOOXNszxy7r7gVWK1YhW4roXWgG8NY3aFSrB8-GZOGmBTs84flF4Ukac2TYI8j6slJ00ZS4MuiU3hEtfx6frBWZVUDyMFTLN1JjWttg6ErhSbonPtq5MjsoweCYU5SAJWpHZgWd6cOF_MEPd4UHtHtp8IJ81YDSV6CEUInJ6lALjWoGd1YT--71ys21vigUWS7E8HB0LRygxOaH30y49ZwNHQVZE5ABPxn6ePhiOu9VJJOWX-TfKDqwDl6n5s4hNJiQGr5e27XD2_NngnQ0GLNQcVB5MQBE1Qw1_VscDzztb8MuqexFRRH6Ql0x3hcjlCs6ZYInViIyxzHXZylV6kXbyTTD9L7XCobt4mbmPVbxoDGAhDouZPd0vMRP8j2gO55SLQviGnmO3yhgsjS-8lSuUoK5oQuh9ymbg9z-Y8zphzNhTORXD9CK3md7h07nx8ebD9e7tV8GwfZGJ2aW4fsbEtdHq3ldcjd8tmspv29Ls1OWCgz_K_y_JB3u-6L_kIgh99EvNXSLD2-b--b8rx5_9JX71il0UVADM9p31R0wBit-NNUAr9DUNREURNf2gGMAgUnG2grHfKUtiR9_tJUl-QW17D1yfAIkwsYkevNGN_pEb78AeNm-Dc) | 3 |

Pour une vue complète avec groupes colorés et notes de colonnes : coller [`socle/diagrammes/socle.dbml`](socle/diagrammes/socle.dbml) dans [dbdiagram.io](https://dbdiagram.io/d) ou l'importer dans [drawdb.app](https://drawdb.app).

Les relations vers `Locale` (tables `*Translation`) et `Edition` (contenu de jeu) ne sont pas dessinées : elles partent de presque toutes les tables.

Après modification du schéma, régénérer le DBML et le tableau de liens ci-dessus :

```bash
python docs/modelisation/outils/prisma-vers-diagrammes.py prisma/schema docs/modelisation/socle/diagrammes
```

## Seed

Les données sources sont dans `prisma/data/2014/` (`en/`, `fr/`, `custom/`) : ce sont des copies des fichiers du front, limitées à ce que le seed importe. Les fichiers `custom-*` (sous-races, traits et historiques supplémentaires) priment sur le SRD dans leur langue ; leurs entrées absentes du SRD sont importées comme contenu maison (`source = HOMEBREW`).

```bash
npx prisma db seed
```

Options (après `--`) : `--only base,referentiels,equipement,maitrises,sorts,classes,races,historiques` et `--classes wizard,fighter`. Le seed est idempotent : le relancer met les données à jour sans créer de doublons.

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
