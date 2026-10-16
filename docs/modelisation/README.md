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
| [Référentiels](https://mermaid.live/view#pako:eNq1V19vmzAQ_yqI5_YL8BY1q1S1m6ole0OaHPtKrBqbHWYbSvLdZ8AEG7Ay2uTRd7_7a9_v4BBTxSBOohhwzUmGJE9lFK12XHBdb6hCiA6NJIq41BFn0etzdyw1cpkZKYO_0Y_nAVOokmuuZCM5jZ1tkchSkEbv-iUO5KmJcffohxGKEgEPJtcZJdntEH5z0kc9KyTJwRMwKCnywktv886FWFrkKOEuocFdoMyy0S2v77_KWAmeyRxMlAWlgKzyCPSeU-ecKyRNcVPXodvr9VcoLXiXczWvSU4y2NbFgkc6MgyUxM6AG13XV5JxuqF7pcTC3B3LQPL5gLhR9g8IRFf4kda7poH8qQO5QgGFqMyD_mbFbRJbQCRcLkzdWgWy1p324wl37VGS8bFrJ7fmCB3izDt-xlNXoTb3-hs9khcis8pM0acqsZyEBC0jWSZtozl2LapUFVIYUOqPBHxinUDzHEpN8qJ7X8BWeqyoCjYovBoCLRRWfYUO6rrgBr8pgLwDlhe7-4rqjVMOktbXaLAJD9NF9Xhp5dkovype2AUwK38wbc0U1v6qdEoI9LcYEJ-cK--L5ni8v1eH4IdJMqo1ZN99OcyhO40L8_3b_vp7u89qbtsm7pIdrT5rN7_TEm-VjTePNQ2slMTfJBPit9YhRk9GRO4SrzWdYdRkIFKfD_toc6yWuGTmcc9RtVbnc3KmDh929GC-72HKnbvt_LpT6F-r917mwNNX86Ufl3kDZ8o8dD9cF6yGGRzThy0-MI6JP4V-ogf_463SCD-Zys31DaM3TfSSVXwXxTmgEbDm1-SQxnoPZpjNIY0ZvJFK6NSAUvPX0ggNQJBaVXrNEWhLky305Xsan1pvJoba1JIascYKjKTjevvPY8WnfyTVeP4) | 20 |
| [Équipement](https://mermaid.live/view#pako:eNq1Vslu2zAQ_RVC5-QHfAvsBjCaAkGW9mKgmIgTmQgXhRwmce38e6klFinRsdGgRz3OvBnO8sRtURqOxYwVaBcCKgtqpRn79uxFrVDTHAgrYzds28CMCU1McHb9ffhELkgYveTsskcdWaGrcMjxbbCrwQbCvdl7Ns6dBe0kNIRxSBzbLZsczkYBpSlB4jxcKHOoQeE07hfvhdor9hSAwa00ji6U8ZoikwacexsKUG46mGMpFEj2iqJa09XDQPDgNZd4K_5gGlVBhfdWRqzOeFvi4GleNdplnwsJhY5A1ay0GKrGL2h84Gs-HKR1OdaHf6__HuDoSivqJsTheVgSqhMSaAufGY2W9BrKp7nRNGp3HeApiwgBp-izB02CNnvOXwi10bcE5E5Ir5uBPr8ICkWuRkWBps0LEbe1w-42NU5n8QWtC12SIxdtbBium4b-kgZYGl1FYHSTa2tqtPS1Pc_wHZij18ToPw1T1KPc9bocpr2uM1m1fBdWGfuFlrfLDQ5bnrkE5zr8wRiJoBlw7hb49sNw8SjQDk4K3rJ4uDvqitY_hBbKq5TNEYKk9UI44C9heqEa5O8nrkUZNObEu3xolasReaw_zfe9FhQvYVirsCidoOV3mu3M-bnZZg5m-5_EAcdd3jGeslnuZ5Fq_pjmgPsxt0SjDvsdzb73Lz_PNlaxWS9eJxh2epYx3CUaNkl_sRedj3al5rEoZWSkz-WwGMwmGjCW1YQi3eLZfnmPhR771Um4SUmiFT82CLt0iz4r4DaRKvBhbX9zo0DobiWLM1YoDIotePMS264KWmMQuPCxKjg-gpe0Ckar8EhrwGAgYWM8LYTFstW81vTqZlW8t2whhrnd6DLAZD0GpPvX90-8Hn7_C3Pvd8A) | 12 |
| [Choix](https://mermaid.live/view#pako:eNqVVctu4yAU_RXEOv2BbJOpFHWkqSaZVakqBm4SNDa4GBZWkn8vENuAH6lnlXDvOfd5MBfMFAe8Rhj0VtCTpiWRCG3OSjBAF_8fISENEhy9vtyPIG2J_gnJo5edlaohORe0rnccPb9EW23_TpmD7RmosRoGropqkOZXZYSSwbX6k5ZQKVUkYHfaUAMnpZs-zi02c9BU1gX1sdK-WHDufHerLndttJAnVChGC9i4-Uw4OdRMi1DaING93pnZZSmzXlUtZoPtDJQPAqo4oWj8tFQaYZokhVZHwQRI1gyw8GlFVbpZz9lHg_12d0zfzYemGroMaE2FzJe0lXzjo6GrenpSl06B605KHrNvFTTCRGmFySVVTYfrSx5tLcCvEZ5L0MN_DGcySpErMblO12sCTPW47jUxh27LmwJ2lY_hQTbrXh6e8ho1kNedMTKlZE0_ICUiWjCnaepgbLOLzNgTK03E94iYadQTD3dpPuD04k1F-0Zw-CX4vbum7WeCWqPhg6vScSDe7bSxRYS0oSWEuLD_Qve7WsJKtbQE31_fJeBuE99h8QrhErQzcP-KXQg2ZyiBuAPBHI7UFoY4EHEPnDc6QEEbZc1WaGDhixugP38TfAvRXA61byRzZqMtOIutuJtL-zy25tsXGIR9jg) | 4 |
| [Classes, sous-classes et capacités de classe](https://mermaid.live/view#pako:eNq1WNtu1DAQ_ZUoz_ADfataQBUgVaTihSDkTQZq4djBcRZW2_47tpOsPb5sUmn70FY798uZ8XSPZSNaKK-KEuQtJb8k6WpeFLe8vWFkGL7Vpf1bl9-Lo2EUBeWqoG1x_9F9hJYqKvhdW7yfqYOSlP_SzBb-OblHqm4puM_DuGuM9U-wBzaRgY9dMYhRNp6c-MtB3rUTQdEOBkW6vmgkEAXttQoZY986xrP5ZZN4kIQPjJhQ_WRsCHcmozdB-Ew0hMGNLlCCyUkHiNDC0EjaG_OIfsqS7KYsXUT3knZEHq53lFF1WAnKkMkkWTVCgs91Jiuy104fHqX4exF791L8pA0F3myJr3fSmfAUkUoH-O7PSPsOtMq6UVhkY9afkXClE8BOLJ7O4HXx41tiDoNRYTqd1h5MBINnRHvW7R4-cg1PD9M9MOaIQVCV4VZMxGlbdpygNTfl42cwaBNDgG6yM1hlY8dfmPoC0Hh-f8PBG8s9YSM8HHpvMnsx0AXwyVByM2eZLx86Fs-QLc5XE9pa2kuJ_dxPgfhE_WMNOkpLGx3SyBUmeVI7IRgQbv-eyB7uTR8bMhjsv3wuUbfMBIUb01gG6XqzRCOpGgm7mfyeIvKDqaAJm7MBMlHfEyYzrR8m7st7r-ecnd24QbU3lNlOV7SoPo9MUavxxaweCeGe2lCgMw3sKKfd2FmWp8B0A7mu1h4-SDH2OCEX0uX2cTWP_QUe9rACSUy-0tO-pJGDm1tuF37gkfcIcUElEzvWB6BPkxPo2pvgNPJ573V5Rg9ZDikz5wJNDV7EjS-HRR2R02uN8PBKV92c8LnjzlXrNSDgR3EvwbZIb8fV5yjs4VwmhR7YeVlshAHmVghcz_5dXzw9vX0rjvFdfLX0OSsd3KxI4drbeueV8H7MOvOv2W2esMZGN_5SRW58Rl4Bbdl8LtHpi1w58pqSdw9nnU0nI3Lg0SNJd5deoVspjxnv2kReTq_Kk8hJu62RPF4zbgKUznfbWmLTYRgnddYr1vQ84VI8JU67jSDFKjFKY6lZPXW64fonBPK6uKin0yyPYfvMxQ6TQvPjljKWPrFWi5dT2zjm6Stq08DnVFdH_zQPmSnBUkE_0KDkdE7lxtJ-WyJR1xl0NMwzG4pHz022wouh9ZXgJBPrIIgnUFjOi1g8jiTxtqEs1vTRg75uQKwZSJZy7tVm5cq1D03JEd0qZFQSfrSiI5S7_0ajL17OSif-2zgrj87grGT5pig7kJrQmm8ej3WpHvUo1_pDXbbwk-hhq7VQXYI0RC3AyEGM6lZnb1fUJPrpS10-W2vah6gOvNFkJUfQlOlanL_SnMnP_wGEJDt_) | 23 |
| [Sorts](https://mermaid.live/view#pako:eNqFVF2P2yAQ_CvIz3d_IG_RRVdFvVZVnb5ZqjawdWj5sGBJL03y3wvEjiGX9t7smWFYdgeODbcCmwVr0K0k9A50ZxhrB1SKHdMnY9IQk4J9-Tj_opAkrVkL9jyinpw0fSQFvs46hXtU86_nO2tVsSqBHDzFpRupcaltMHSh0ARdct-MHJlt9EAwzEkKoAq1A9Pj5jDgbJ6h55uFe3TbaeGEeauBJK_BCKGTk1QglxrUFX2ynj4M91c8WeODRlFUJ4KD1LS6wAktjz6ZcWs4GroICicgAv6r9vGwx-VWKkmHor9Znqg2cI7elyYOobZISCv_XNv101uzZQI09NhyUHEQJbHDDFXMZT8bHC987W-Dbj22guIoPYEeGI_bEYol3RJhEDNxvsZxE2fpVe5FmUyfuHWK58NNFpWNpeFTzPcd0oDGChDouZPD3OoR38l-h-4lBdlXxDTqDb5SRRSh_Wyp3iXncULns61yk9M43jlajsxVXHLZ7BP0krf5lrHT6fHRHservLjevSQbg9Jy65CdbK0rgzS_BaVbOYnFVOV9aXGwSlng_5SX53xT9bFqKwRy-F3EOyzN3Nq3Xf2vvGzee_rmgTUaXQREejyPXUM7jImKP10j8AcERV0UdfFdTWAUKDjYQCvpkOeQZenL1645Z7e4h20PhkeYXMCIXO7B-CqP8PkvuUzy2Q) | 3 |

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
