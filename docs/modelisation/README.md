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

Migrations : `20261015160000_add_srd_socle` (socle), `20261016180000_add_srd_races_backgrounds` (races et historiques), `20261016190000_race_sizes_json`.

- Nommage, contraintes CHECK, JSONB, seed et API : [`conventions.md`](conventions.md)
- Schémas Zod des colonnes JSONB : [`src/srd/jsonb.ts`](../../src/srd/jsonb.ts)
- Domaines modélisés mais pas encore branchés (monstres, personnage) : [`brouillons/`](brouillons/)

## Diagrammes

Liens mermaid.live (gratuits, sans compte, le schéma est contenu dans le lien) :

| Domaine | Tables |
|---|---|
| [Vue d'ensemble (sans traductions ni colonnes)](https://mermaid.live/view#pako:eNqVWMFu2zAM_RXD5_UHeuvSDSjQYkVddId5B1VWE6G25clyi6Dpv0-yJEu0qCQ9xSbfEymGFCl_lFQ0rLwsSiavOdlK0tV9UVz3zaYl4_inLuffuvxrxFfPvOVqX1EhWXE4XFyIj6J65W1bXBYk0t00Bn1L-u1EthopZuTyflmMVPJBWZhdwGHupXjhlLOe7g3MqCwKmsbAqQM__k186FivcALz6hV6QxTbCrk_wfKwE-xUcVkMRKZmfUATwo1i3VnuHudT3F9Puyf0dSN6ZUTGQ_qKAg_Fb0YG0VeKqDH16pp0-h9-3A_LnwThzaK3-FjrHIlEOvIDk8qE7H2WxqRFeZQ3uMfMZq5kJ2RmLwn4ie04bVlu665m_MY3O8GpSXZqpC7Xp2eKYkansLB5nZ-MqCkkO1zOKS38gdAUJrVwMSoxxGjlFvQoCVcJRBmpBXzXGbGVYuqbBPW8qJz7s-LXoLjoLfgQwDb3rfJE6QSOEC0sN6dyfz0wqCM0v2K-pHBXHCLyJ6534AlgDAGVOW0Q0rlHzjHqKhDZVAHsNGk20r7FtYoRI5jLFCZ1VvRHOMoi8C6A4FsHyZ_0CCk97quBhUaCMEajz2Y73EHI-1DWLnnMy73kHZF75yqscaxJ4qR0C6ixirzxfvu4k-L9TEuQcaYZ2OYiM6AesoSkHvC9KCKV9i0UCzCVdKUsKXv4Rrxb9sZaaCCSJ8g5f6pWLD7N0iPrP5Lnlm1EO3X9iWM-RSMHfsatJ9JODHEpWTTPnPXYRg4uwGbnlIwmyOemGKSkOZai_MAYySpG_ZkdbOKJMxc3jLKtdwQUVfp6sbupVXxe5MGkkGRpEmJ7ztHOrK1A_3KV5agn621JwkxqQtQSOpCXIMQJNEQZ60JruLSBa0AXQqPlFzpdUwF5xgAFCfEMDuGpJ_eSzd6PXOETGGw9eaaPQRVCZ4c3a9M8u-z7LvppBGMclpYIIc3ItYXoHhZWD20aBcIWvV7RttN4OddgU0jUWeNV_IyKzq0AstouGGLR-ylKQ6YH1Jp3G5uVUWC0PzBkeH2cdullyaPW1yRgcX6Bh0FkFTlHEEJyesTjvWUFCaSup33EYI76JatY11_bTuaF4_TV0HB0z0yOoicmSZZ7xdr6MbS_Va8VVy3f9s6d-NIR5OcwiX-2ZHPYeJ55Xp06L1qULxCEkFbHHdlyWumLlWhBH5-_5RhpfnZfcOTNVyHWXMxLVBCwiUeFkoPHJVN-K8qOyY7wxnza-qhLtdMdu9YvddmwF6J7aq1BdcmkEWpAS_ZiUtf6cJ4nEgu9fajLz0-zGpmUqPY9LU2tTUxLpqHRFzH3zcyJP_8D-d_r5Q) | 58 |
| [Référentiels](https://mermaid.live/view#pako:eNqtV9uOmzAQ_RWL5-4P8BYlrbTabbVq0jekyrFnibW-UGPaoiT_XgMm2FwaSPLo8TnjOWPPDBwjoihEMYpAbxhONRaJRGi1Z5yZckuUBnSsLAgxaRCj6O2lWeZGM5laK4W_6MdLh8lUzgxTsrKc-852Gsuc42p_wm-1xB7jmaIv4ZFcEcxhbePu7-D9XsNvhtvjLxsSCwgMFHKiWRbEuf1gnC9VOxpq526e3ryCLhE6S8-Ks1QKsP4XaAJZCATmwIi3FkrjSuXQ9cz7bOF3aZy83THxGyxwCrsyW_B-e8R52ugF__AL_IpTRrbkoBRfKMJjzlMhOsLDZaw1YFPoWy7Dp84TQjzGXUoyXthH_82Z62h2oDVmcqEGx5oXvmnAt0TeJExJyq6cAQ1ieEYd-tDVzMS38Ie_n1cs08LW2F2SXCfTWLs-5jpvfZrHq1G5KjSBDqX-SNDPtDEYJiA3WGTNWwO6Mv2NIqPdRqBhXi65Q9-VSlNmzIK3GeAP0PnVNL9p9c4IA0nKR2TaHg_TE-4_U74-5VfBst7ACOxrm99U6TIcuZ6EeYnOOsLNJRd8K51OT0_qOPnJE_dET_GbT5ExdLPjw0L_LtHh_G-jGpvasT-de5PT8cZHYhyMvv68ctSJQRSHA2cwJRx7qv3HvTbvN2dHHem6cdddw1bZnjbW8GK_sQXd6KRq1mUdX5pJCDsFsNB3V-je3TZ-_XIMrzV4L2Pg4av53NbNOMErtwDdVtkVVleM_T7ixE_UZRzWXxjoMfz2K4yGn1QJe31d6Q0DvcaKPqFIgLYGWv30HJPIHMAWs10kEYV3XHCTWFBi_4cqowVwXKrCbJgGUvfLGvr6PYnOtTd7htqWkliz0QVYS9P93d-UM5__AefXk9Q) | 20 |
| [Équipement](https://mermaid.live/view#pako:eNqtVttO4zAQ_RUrz_ADfUPtIlWAVFHYfam0GuwhtYjtYI-Bbsu_r3OhsdP0wnYfczxzZjyXE68zbgRmI5ahnUjILaiFZuzHq5elQk1jIMyNXbF1BTMmNTEp2Oym-0QhSRo9Fey6RR1ZqfNwKPCjsyvBBsKt2edgnAcL2hVQER4K2XfbDV4YDgWOw-X6JxoU7iZw5gVRe8VeAtC5cePoShmvKTKpwLG3oRJ81cACuVRQsHeU-ZJunzqCJ69FgXP5B9OoCnJ8tEXE6oy3HDtP867RTttcSCp0BKpk3GKol7ii_oEvRXeQ1uWbDfmXRmwBgY5bWVax9k_IlFB9M5O6G_1JqdlnwF_GRtPhASiDVY9Ohix60KsHTZJWW_JfCKXRcwJyMXmc4ezm4ouiGY82ywgK9c97ZYJqAiYy7niDPaxK3O3AG1oXGlj0XLSxYe7uK_pr6uDC6DwCo5vMrCnR0nlaMMB32oi9Jz7_fc6iZp1wzyaZ3gCU_dxq4iurjD1jCGolAIc1z7gA5xr8yZgCQTMQwk3w484I-SzRdk4KPgbxUATUOS3vpJbKq5TNEUJBy4l0IN7CPEPeaeVPXEoeBOnEu3wJmysRRSxW1fejlhQvZ1ixsDqN-g3vPduYy0uzHjgYbX8texw3w47x3I2G_inpD6JPs8f9mFuiY_v9jmbf-vPD2cYCN2qF7ATDRt4GDDeJqu2kP9nK0Fe7UvNYpgaEpc1lvzyMdmSgL7QJRbrOo-3aHgvd9yuTcDsliVb82CBs0i06VMB1olngw9r-FkaB1M1KZhcsUxg0XIrq_bZeZLTEoHThY5EJfAZf0CIYLcLTrgKDQQEr42kiLfJa_GrT2_tF9lmzhRhmvtI8wGQ9BqR5GLQPwxb-_AsgM4fa) | 12 |
| [Choix](https://mermaid.live/view#pako:eNqVls1u4yAQx18F-dy-QG5dZytVrbRVkz2tVyuCpw6qDS6Gg5Xk3RfwFxjbpafWw39gZpjfhEtCeA7JDiUg9hQXAlcZQyg9c0oAXcz_CFEmEc3R63P3CUxV6IOyfFolZ84bcL5L3DRPOXp8nmyNOi2Zre0RsFQCZksCEwg3WbBKgamc2U6YfBSCK5bPFmosgMlftaSc2aW7325iNeelI9ZfKZZQcNGO-9ymEh0FZk2JzV4r1erLQ72gGykoK1DJCS4h1TcwX8mhIYLaGGcndoF_57Auj4aubvYkodrYkE-lmoyfCjNJZesUnDPVOCcK_k4JBUbamSt8KlpX-g7W7EHBv-wUIjrzsa2D3gChu2MefolZoXAxF-MTLXVSB8KDI5oayjKi74gSwiT9UOnek05jDQvjFexZnpqU0JXf3_PLAN1uoMdoDj00gWaiyd6mU5rl7ca6GfmbRiiQdVz1h4olxQifER1N7oGkr4gR_BgBDFQum0FnW_F1Evu8GvnPeaMEB_jYOhPtenWELry7kZs1dR_eknCIPJRbtHYjQsbldQLDj9vz8PDxkt5wcsiKqNOy66xsq43leYctljpEbjl64Nq-6njd8BmJNvKXHuQN_cS6cXhwEN9w8ieBpcIMgA2PfkCssOFnMFHihXPxfgOwkgL-5bzSycI4NRysYuTDkPmTJfZvlvyN8vMuPsrBvfAYh6mhv6UeeznGa-yOGLELZozeTtEYYdc5Ucph3EeKRWwIA1VRWtu9XymTO5RUILQhN8_HS5bIM1SQ6Y8syeEdq1JmWpTpl6UxakGJW67kngog9i1ipS9vWXKzu-kz-KFlJDGAKNAWVef6tvt3aW--_Qe15azw) | 4 |
| [Classes, sous-classes et capacités de classe](https://mermaid.live/view#pako:eNq1WNtuozgYfhXE9cwL9K5qp6tRu1JUqr1ZVisH_plaY2zG2OlGad99bQPxOUDV3iTi938--YNT2bAWyquiBH6L0U-OupoWxS1tbwgahr_r0vzX5T_FSR8UBaaiwG2xu7eP0GKBGf3eFncTdRAc05_qsIX_LN8zFrcY7PMg943W_gAHICMZqOyKgUneOHzshQL_3o4EgTsYBOr6ouGABLTXIjyQfWsP3vSPCeKJIzoQpF29EIzxKA6FsAYRuFHJCk8o6sAjtDA0HPfajkc_h4v2Y7jWtR3HHeLH6z0mWBw3eKdpaJSqGsbhfGR1V-igrD89c_bysYp3nP3ADQbabPW4t5IphwXiQrn87bfEfQeKf5t2mOUC-m-JqFDx-NZM8220QGzDRnnqVHAH0OYHR4myrFpiuKeql50B6IEQSwycqvRpRdhi_IY7cNGofvD9HJSuIZgJtNddTWRHN-Zg7uZ4VH7B0RnmAyISno69M889G_A8HUlXVk6q4d0yqiSePJOiv7SP78ly5IIRpsIotJQWN8ofSYVPcrj2jBFA1Pyfyc5I6Go2aNBj4fo5V2B3_2VxcKey6eEKF67WDNwWafaGYyERuRntnj1ynamg2bhPkw2QULmuB4aReUsTqBVALi7sIO1b50LL-FvtT0kENryPejdxeMdSu1DSDlPcyc4cOQJElZSq_B3gD85k70dmXfqELV5Nq-EDIENoN9munwQa5jBWdmJ2H74fOnhuLDVjwoG4H0caH9uwvQnQl3t2p_Ikk_f-dPIB1Q3u0ZXXjOk9xP0L_jOB4xTwBvwYJu-jesF1Z8fB1EqtUtjuj8mX8K7laY-s7Af_tIq33vwOUby-fv3KTjEGv5oLnuUOYLEncO0sxMtC_urMGnNx8jpLvsRKM-6-9cy4B3kBb-nmY4kgtGfKkpeEHCydNTYiaM-AQ484Lay98oBVvmccjOpZOd8zryzHbddHEvJmzARdOoG8pcBGFBkHddGqL-lY8lPxmsCBK5vUF4m7NOaaxFM4z89_giEv6yf1DNzyPWzuu9hgkmm65VLK0uhrMXk5sZVjngZYqwY-J7o4-ud5yEyJzxXUwxuUnMw53T63W5aI1VbGQw_TzIbs0XWTzfCsaHklWM7EOgj8CQRmnBGzx54k7jYviiV570JfVsCWFCRTOdVqtXBly-dNycnDKkgKDv-2rEOY2lfX6APORe7Ei8hFfg8PZznLL0XZAVeEVn_lPNWleFajXKuHumzhB1LDViumugSuiYqBoCOT4lZFb1bUyPrwWJdvRpuywaojbRRZcAmKMsLG6fPpRH77H-qtW78) | 23 |
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
