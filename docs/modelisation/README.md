# Modélisation des données de jeu (SRD)

Le schéma est réparti par domaine dans [`prisma/schema/`](../../prisma/schema/) :

| Fichier | Contenu |
|---|---|
| `schema.prisma` | générateur, source de données, modèle `User` |
| `00-base.prisma` | langues, éditions et **conventions de modélisation** (en tête de fichier) |
| `01-referentiels.prisma` | caractéristiques, compétences, alignements, types de dégâts, écoles de magie, états, langues, maîtrises… |
| `02-equipement.prisma` | équipement, armes, armures, véhicules, paquetages |
| `03-choix.prisma` | structure générique des choix (maîtrises, équipement de départ, options de capacités) |
| `04-classes.prisma` | classes, table de progression, incantation, multiclassage, sous-classes, capacités |
| `05-races.prisma` | races, sous-races, traits raciaux |
| `06-historiques-dons.prisma` | historiques (tables de personnalité comprises) et dons |
| `07-sorts.prisma` | sorts |
| `08-personnages.prisma` | personnages : classes et montées de niveau, réponses aux choix, sorts connus, inventaire, état en partie |
| `09-pnj.prisma` | PNJ (race, classe et alignement référencés) et tables du générateur de PNJ |
| `10-monstres.prisma` | monstres : bloc de statistiques décomposé (défenses, langues, actions, attaques multiples, incantation, formes) |
| `11-objets-magiques.prisma` | objets magiques et leurs variantes |
| `12-regles-guides.prisma` | règles du SRD (chapitres, sections) et guides de l'application (pages de documentation, aide-mémoire de combat) |
| `13-campagnes.prisma` | campagnes d'un MJ : joueurs invités, séances, quêtes, PNJ, rencontres |

Migrations (`prisma/schema/migrations/`) : `20261015160000_add_srd_socle` (socle), `20261016180000_add_srd_races_backgrounds` (races et historiques), `20261016190000_race_sizes_json`, `20261016200000_stats_own_primary_key`, `20261017100000_character_model` (personnages ; supprime les anciens personnages en JSON), `20261018100000_presentation_and_npcs` (présentation, règles de création, PNJ ; convertit les PNJ existants), `20261018120000_monsters_and_magic_items`, `20261019100000_rules_and_guides`, `20261019120000_campaigns`, `20261019140000_guide_defaults` (valeurs par défaut des guides pour Directus). Les migrations de février 2026 sont celles de l'ancienne base.

- Nommage, contraintes CHECK, JSONB, seed et API : [`conventions.md`](conventions.md)
- Schémas Zod des colonnes JSONB : [`src/srd/jsonb.ts`](../../src/srd/jsonb.ts)
- Domaines modélisés mais pas encore branchés (aucun pour le moment) : [`brouillons/`](brouillons/)
- Règles de construction d'un personnage (validation, fiche calculée) : [`src/characters/`](../../src/characters/)

## Diagrammes

Liens mermaid.live (gratuits, sans compte, le schéma est contenu dans le lien) :

| Domaine | Tables |
|---|---|
| [Vue d'ensemble (sans traductions ni colonnes)](https://mermaid.live/view#pako:eNqVWlFz3CgM_is7-3z9A3lrN-1NZpJeLpvrPdzeA7HJhqltfBins9P0vx8YMBIIdvOUNXwfErKEJJyf20a2fHu12XJ1LdhRsf4wbDbXQ7vr2DT9c9gufw_bf-3wxyfRCX3aN1Lxzdvbhw_y52b_XXTd5mrDwNxNa9G3bDjO7GiQckGuz1ebqVFi1A7mFvCYeyWfRSP40JwszE45FBZNgXMFPv83i7Hng6YJPEwn6B3T_CjV6QwrwM6w84mrzchULjYYNCPcaN5fpG6d39D6Bto9a77v5KDtkNWw-U4C3zZ_czbKYa-ZnnKtrllv3vDjaVxfEoa367zDw1mvCBgylh-50tZkP5ZRSFonq7zR_yxs5qPqpSrsJQN_4y-i6Xhp6z5mwsZ3L1I01tkbO-p9fX5qSMzkJxxsWecLZ3qOzo6X85MO_sCaHKbM4CpUUYjJjTvQo2JCZxBtRx3gk_GIo5Lz0Gaop3XKq79M_DFqIQcHfotg5_tu8kzoRI6UHQ43P-VfPRJoLLQ8UrrkcB8cEugD4x1pghhjRBVOG4J06ZFToyaGKLoKYudOs1PuCcYqRQQw7ylcGa8YKhztEHQWIPCdh5RPeoKUH_f7kcdEQjAmO1_0dryD6PcxrL3z2IcH3sjevIyWt15dHOdUoiwT862QQu-V6Jk6vU9gRrpQ2J69iuH4-KLkjwslYcbFe4K5FYhBQVgkZEFI70UzpY1uMUKRqCwVFknFEx_wbvkr77AAMJ4hF6fdd3LVaRmtrP_Injq-k93cD2dyS44mskxBrW-smzmhUrZombnMUxt58wa2O2_YZI18qYthSu5jOSpUqWBszxufKCYwWvOf5WDBxnZnDQECp0y62N3cadG4Y8B4kuK5L1JbL9EuDLFIf3ewlahnw271xYKHYtRqOuSeyMQZNFqZyoApXDnDtSgDktYKC50PrYi8oHjDBFj_Y3iuyb3ii_aT0HT1h9NemRlssI-mc4Wjk2l_e-_7JId5QiUk5ZYEIffIVALoAePqsUQggbg8SFd0qRwu55N7DgFZHa4S6mOyZkaQZLuogCZ7Y5JGVC6ktKA2VaeTQLA_VOCEeeh2eaMWUGmLhiQuD_gwAFKJc4QgZKcHbC0cK45gatppEAJL1HdJpZJ_KjsrG-r0pHao7pmrSQ7MOsna06TSa-jQ0acTHztxHLw6sOGJ45cwWfjtyPawCTz7Ozl1ns1QOUAIQh4dd-womr1p6mSH0vlyj2RHy33DimOvIQqp5GIfQEDgJA4CpQRPQwaeLrsXZmLUtET1njyCULhTXXeEpk4BXmQOTt5bnEoVRYa03bQfrxRnBSpRoBWl7kK9gMVlSTrD125XEmySqPF0KmAt5BEMOr2kCdHlk6mCtW4G22RPyNag5L7E4GCJd9l8vVPCRk9vV3J46YJFFhjwuMlvBFI0zvjExUpKSA7X1O7y3LZhh1O01toGpMaqulHG2pW6iJQBa9y6UrZ__Gty1VJJu4zpq8QSj7xXKlCzmjS5X6FpoHAoaxmuobB2ZZegL9oqITArFRqiSy0H0mNOqyZmWVsIxkhFYTm0Yr3oxBqvU1VS-J3nqq9jU8tSbhrlp_TS20FgQ5umJIdIkpEdjDokWWQYm_JJmMNLTcgqfrm--Dzo5VNM3Aq-EPWttxwmlz3ze9Awh6HGZNoVBb0bwIuH6RKpwbiaJFiTIVlZOUcQEvsXJNiPIyF3IhGo56TQ8OyKXlnGJ06ZQ0qawRKbraOFCr3KTo6MwutFl5zY7NTVDcUiKlxalv-yii3vvpaSQPC5lF7RFa13shXPYvFqtHTeEpZoab1LS1tf_E3fz4M743BQpOdVhUg7SEIElwZIUHrBkMNxxVEIh3BtWHntkiRk7QcGUGKcza23NHHXeS9CcwrvhxS33PExrU3a2ms-2u3Fkap74stYZBRC4FuBB_dXC6FzV79pJqJ5IDNRAEImeU2MCjcKXTPcF6n61GDFr_lL81v_BBghYeuAA-98HuaOm5JgBCrZoXgf3rhJh_59Fi2_B1GzDETwuIYLmoDgHVOttQiHPpy8JwgEbwfmbAiJ-RqqTgHjNNBymUxVvBXTcg1vfvqDifUjMwlyraP88x3vn1w14AeyYk0W8EmhVlh_z6fJvwksIMH_OXOvMUQtRZREgKN45eprqJ9KYn3Rli9GwYbSap-HxlS9mrJPsr3wnzGAMLkpHwzrRLp0rMd4GCIjjSCs4bb9bbPtueqZaO3_Pf08bPUL7_nBPBy2LX9m5vg7GNBhy5UdNICOneSsr4Vy_uSgtw-H7a9fdjU2a7k_Dc3W9jQzNyPz2JoQ9f9Q5Yd__Q-IBmyy) | 106 |
| [Référentiels](https://mermaid.live/view#pako:eNqtV8GOmzAQ_RXEufsD3KKklVa7rVYlvUWqHHuWWIttauy2KMm_14AJNpgGkhwZvzeeN_bMmGOMBYE4iWKQG4oyidiOR9FqT3OqqhQLCdGxtkQR5SqiJHp7aT9LJSnPjJXA3-jHS48pREkVFby2nIfOthLxMkf1-oTf-hM5jGcSffG3zAVGOaxN3MMVtN9L-E1Rt_1lgSMGnqHUjCFZeTYCJZa08GJPP2ieL81AMPze3bwclDV0ifiRxpCeVU4zzsD4X6AJuGYRqAPFzjcTEtUqx65nnnEHv0vj5ImHxG8QQxlsq2LBnR4Q52kjF_zDD_AryihO8UGIfKEIhzlPBesJD5exloCUlrcchkudJwQ7jLuUFLk2l_6bNXvRpHqvbtdi2cvkWNItiprNtyAlonxhyJY1L1TVgm8OcS04oVf2gBYx3qMJfexqZpI7-MOv_ivimTbt4S5JtglLJG0LtkOj2c3hNahSaImhR4k_HOQzaQ2KMigVYkV7r4Cs1HBBF6Rf8DTMy2Vu0Xel0lx1asBpAegDZHk1zW9SvFNMgePqEZmuK216OP_n0dLs8kvTYjDrPPva5DcTsvJfC46EeYkuesLNJec9_U6npydxnHzBJQPRU_z2FRVCtysuzPdvE-0_XbqoQg-OxH1YDIa-5YWneeJN7eGotdSJGZr4s3I04Cx7anIlgwkVmisDF4GBkYwHg9vlrYNA-076Nu333G7PUOdM3A7ptbWTaFiX7-TSlXzYyYP5vvuO4VyS1q9b1_798C5eCDy-fp-7AgwTnLr10F25XmH1VT1sSFb8RIEnfiH7gR79969WEn4Swczx9TU8DvQaK_4UxQykMZD6Z_C4i9UBTFcwH7uYwDvSudoZ0M78J9ZGA8hRJbTaUAm4abwN9PX7Lj433sweIq04NmYlNRhLO0bsX6Y1n_8B6oP11Q) | 22 |
| [Équipement](https://mermaid.live/view#pako:eNqtVttO4zAQ_RUrz_ADfUPtIlWAhCjsvlRaDfGQWvgS7DG02_Lv61xoHDe9cHnM8cyZ8VxOvM5ywzEbsQztREBhQc01Y79evCgVahoDYWHsiq0rmDGhiQnObq-6T-SChNFTzi5b1JEVugiHHJedXQk2EG7N3gfj3FvQTkJFeChk6rYbXJocJI7D5dITDQp3E_jmBVF7xZ4D0LnlxtGFMl5TZFKBY29DJfJVA3PMhQLJ3lAUC7p-7AgeveYSZ-If9qMqKPDByojVGW9z7DzNm0Y7bXMhodARqJLlFkO9-AWlB77k3UG_Lp9syFcasQU4utyKsoq1f0KmhOqTmdTdSCelZr-F_HlsNB0egDJYJXQiZJFALx40CVptyf8glEbPCMidnPDZw1U8LW3SERTaUSRVg2ogJiIegAa7X5W425BXtC70UyYu2tgwhncV_SV1sDS6iMDoYrfWlGjpe9IwwHfaxL31fH587KLenXDPJplkHso0t5r4wipjf24map0AhzXtWIJzDf5ojETQDDh3E1zeGC6eBNrOScFyEA81QV3Q4kZoobzqszlCkLSYCAf8NUw7FJ2S_saFyINcfe1qHyroSkQeK1v1_aAFxZsc9jHsWSOVwyLBNub83KwHDkbb_9Aex82wYzyVo6EfUP9vktLscT_m1hO9_X5Hs2_988PZxmo4alXvBMNGCwcMNz0J3El_shWpj3b1zWMRG5CdNpf94jHaEYlUlXsU_WUfbZf6WOjUr-yF2ylJJADHBmHTX6pDBVz3FA182OK_3CgQutnQ7IxlCoPCC1499tbzjBYYdDB8zDOOT-AlzYPRPLwDKzAYSFgZTxNhMa-lsTa9vptn7zVbiGFmK50HmKzHgDSviPYV2cLv_wFyNJSg) | 12 |
| [Choix](https://mermaid.live/view#pako:eNqVlstu4yAUhl8Fed2-QHadZCpVrTRVk1mNRyOCTx1UDC6GhZXk3QfwDYzj0lXrw3_g3D7COSOigGyDMpA7ikuJq5wjtD0JSgCd7f8IUa4QLdDrc_cJXFfog_JiWq1FQxUVfLKQkxANeN8MN81TgR6fJ1ujj0tmZ3sErLSE2ZLEBOJNFqxKYqpmtiMmH6UUmhezhRpL4OpXbTNwS3e__VRrIZifqmBbrKAUsh33uU5FO0jMG4btXjfq15eHBkE3SlJeIiYIZrA1PZmvFNAQSeuhyt6JXeDfOWzesmizJwXVyoZiKtVk_NSYK6par-CC68Y7UYp3Sihw0s5c4VPTujI9uGWPCv7lpBDZmQ9tHc0GSDMd8_AZ5qXG5VyMj5SZpPZEREc0NTCWMHdES2mTfqjM7ClvsIaFsQU7XmxtSugi7u_FecBwM9BjNfsemkgz0eS66ZVmebuxblb-ZhCKZB1X_aFySTHCZ0UHm3sk6StiBT9GACOVz2Y02U58mcQhr1b-cz4o0QEhtt4dd7l4Qh_ezcjNLXUf3pJwiDyWO7Q2I0LW5XUCI4w78AjwCZJecfLISqjTsuusbDcHK_COR2zrEbnmGIDr5qrjdcVnJNrKX3qQV_QT69bhwUN8xSm8CRwV9gJY8egviBtshBlMlAThnIPfAKyVhH-FqEyyMN4aHlYp8uGS-ZNn7m-e_U3yCxqf5OA3PMVhGuhvqcdZTvEapyNF7IOZone3aIqwm5wk5XDdJ4plaggDVUlaN71fKbM7lFUgjaGwD8pznqkTVJCbjzwr4B1rpnIjys1b0xqNgOFWaLWjEoh7izjpy1ueXd1u5gyxbznJLCAajEXXhel2_1Ltzdf_xQyzGg) | 4 |
| [Classes, sous-classes et capacités de classe](https://mermaid.live/view#pako:eNq1WNlu2zgU_RVBz80P5C1I2kHRDBBUaV-qwYCWbhqiFKlwccdw8u9DUpK5iZZUOC8JfHmXw7vx2MeyYS2U10UJ_A6jnxx1NS2KO9reEiTEj7q0_-vyn-JoDooCU1ngtnj44j5CiyVm9HNbfBqlQnJMf-rDFv5zes9Y3mFwn4XaNcb7PeyBDGKgqita_PSEG0XkwRMKpnjjGbPfFPjndhBI3IGQqOuLhgOS0N7I-ED1rTt4M3_szb5Cw7oONND2ZocJloczF7VovWsaGRqsqoZxiI56JmxiwoiPHFFBkDnYEGrMKGENInCraxafCNV1iB8CGUUdBIIWRMNxP4HyjMdKoN1QCQf3gWPj94LJcb4rtNfRH585-31Zxw-c6Q7CQJutiHtnOQdYIi415I8vCve6a-RG7zDZRfIXhajEQ7-7aHYuNkYgbpaSPHX6cnsw4YXnREfWLSG-UD1R3mz2QIgTRqAqc1oRtnh_qx1BtK7vQ5xC-xLRnKCd6XSiOroxB1M3p-PzC_yVskdEweOhh8WRdVBWTq_V3TK-JJ08m6LvBuOfZDmBYI2ptA6dpMWNxqOoDEWe1o4xAoja_yexNxKmmg0SZixW1enDt3XbU5hZi58GEwi4q9kEjmOpELkdYJwA-tgqaBaKJjztpU0-43ldZ4hBeUtr6MVAzq7xqBhbp8XYhLvub_324mZ4HvXG4vAHq-5MZTtMcac6e-QZEF1ZqvO3h784U314MwfpHXZ7NS6MC3CcOO5s106mzfQMvxPDme61sjWzazPfm0sMI4Cx1J0zANIGHWR86Mv2NuKP_tknnSc1Sw_GkwuUO3puV75GthkRD3nAe7Lc8cIbqGecvEv1gg_ngYOtld6tsB2PzZcMXu9xsazsh_C0Stfg9C2oeH29umLH7BeG66nuxujG23vLhuGWzAb1CxdEm9WOKPs6eInRSmg-h18XKbRYGcbf-kEY_yBvEKz-_F0Seh-EcuIlI4_nZ4MN7D4I4MkTTUe5rwPSl-8Zjz8HUU6v3SvLabudNUvHM2GiLh0J6NLFBoabXups1NDSixSm4nWGo65s0tAk7dJUazSfI53XEbnMkdO8izC3JxaZb2X71oZ1t6I5pfGFnXM2TwUXc5gzWznt82xv1dznTBc3wGksMsMSakX1COYlZ3NKd6jtlyVRdZUJmMs4urF68tRlMzw5Wt4MTnNmK0R4IoOJ46TqKZKZJy64xZJ9QCaWHbAlB7OpHGu12rhy5Qum5BjwJKQkh39b1iFM3bfr5Dems9oz34rO6gdcPKtZfijKDrgWtOY34mNdymc9yrX-UJctPCE9bLVWqkvgRqgVCDowJe_07e2KGlTvv9blm_WmY7DqQBstllyBlgyUdfzxeRS__Q_978pQ) | 24 |
| [Races, sous-races et traits](https://mermaid.live/view#pako:eNq1Vslu2zAQ_RVC5-YHcnNjBA2SQxAH7UVAQZMTmYVIqlyQqIr_vaRWUqJdGUlv1ps3Cx9nxmwyIilk1ygDtWW4UJjnAqEnTAA1_hdCTBjEKHq8nz6BMsOkuKPotke1UUwUzkjhrUN-aSn2SLM_oCOgAqA6diJSdAAIy5GWVhGYkslXAeqOdoBhHLTBvEJEATZAN2ZusBUNDT6EqMitgt8WBKkndI81fANWHMwNn9BDi3zHimFBILR4_o_Wel9M6GvE7yzHQcNnhYUusRfrjJzKMZdalpLgEm7c9cwtAnOIAG05x6qOMFzAM7yZGCtZITgIs7D4e1qAJRaFDeKMx9rsWclM_VUKq9efy0O489wRqeamvY8WpXno81-WYqh6hMPbYOayYMa7xJF2dq8-Ph6JfJ_f_WG961pRd-QPdSMFTRSrfKZ5ESsbZ1nFRb0znfjsdaezJG78X4HW3neFlZu9WT6KuR-xugoL6XYlJoOG_6052qOta41YmM9qjLaARyVfGGF-PV9QQCvp5Lmcd_T-fnUlm8Umvu4nL8WLOjQkboLuO-MQN2kqw7jVwugjmCZOO-3E2Vx_huE6JEHpNZxHGXZaGGPAYkqs4zhCpx1m-kQeKU3TbktZT5bXnjNKE6kxIwaC9DTZ0gb7MLOesB1Hdc4Kh3iRcTFjqawBNZyGiBoaTjtEI7FQuYkfBNYo-Eklx0zAODvBOdfQ53_TZ8mJUT_Jz76gjINyAPUv1CbPzAHcTnEfeUbhBdvS5I6Uu8erBx2hxLW0ZssUdLuzpT485dmxjeZyyF0tSOZ1teCQbiX2T98ePv4F_Gi8wg) | 12 |
| [Historiques et dons](https://mermaid.live/view#pako:eNq1VsFu2zAM_RXB5_UHcsuWdSg2bEGzo4FBlZhMqCW5tLTVcPPvoxw3tizHyVL06Ec-kZLeo9VkwkrIFiwDXCm-Q65zw9hHLh53aL2RrAnfjCnjmJJs_bX_BKmcsuZOstsOrRwqs6OghOcYEdYcADBes8p6FNCvZP8awDt5AJzSUDmuSyYQuAO5dOOAL2Uf2McN_0RuqoKHzmZ6fzjmp-0XVvACPtG5jCOGa4iAymvNsY6wLTXtEb6Pczt8BZVAVYb-Jrpfo90qocCI-n-7D4Gypx8jowobx9FRP5-fvCo1EOmKOvBKHuFPnhunXD21M8DKGl5Q9Ed5ze20ynkkbQ22aysVHWRS5DI12HJayKeV4ODZna66LNTOnDnbpGYA-Ssxvr1bks4bjfhOvgudXXbGQf5v8pqcME4ov0bAoEeSAlxevz3tBxXubCMswiiklVHa6zY0vB4HaGinf-ALybOckDl7ebm5sc2JgbSIpH2OORwGKXMYPUONxsK5qumASGv3sYvog3Fxds_JmJg7szS7W3B2ECyO5rt2td7g8Vo9fglz4Pajyzve2FeLTr9TeZEBhonLgb5nCLENEmITuZB7h_BLWs2VgaP-k4E3m538emazJ36JJ_OzDyzTgATI8KZp8sz9Bpoj9JFnErbcFy6npJyeOwGkhILX1ruVQhDtaGlTv93n2b5djWrYTW0EwQ49EHIYgt1jqYP3_wAemDo-) | 10 |
| [Sorts](https://mermaid.live/view#pako:eNqVVNuO0zAQ_RUrz-wP9K1qtWjFghApb5HQ1B5Sgy-RPS5b0v47jpuL3S6LeEvOOXNszxy7r7gVWK1YhW4roXWgG8NY3aFSrB8-GZOGmBTs84flF4Ukac2TYI8j6slJ00ZS4MuiU3hEtfx6frBWZVUDyMFTLN1JjWttg6ErhSbonPtq5MjsoweCYU5SAJWpHZgWd6cOF_MEPd4UHtHtp8IJ81YDSV6CEUInJ6lALjWoGd1YT--71ys21vigUWS7E8HB0LRygxOaH30y49ZwNHQVZE5ABPxn6ePhiOu9VJJOWX-TfKDqwDl6n5s4hNJiQGr5e27XD2_NngnQ0GLNQcVB5MQBE1Qw1_VscDzztb8MuqexFRRH6Ql0x3hcjlCs6ZYInViIyxzHXZylV6kXbyTTD9L7XCobt4mbmPVbxoDGAhDouZPd0vMRP8j2gO55SLQviGnmO3yhgsjS-8lSuUoK5oQuh9ymbg9z-Y8zphzNhTORXD9CK3md7h07nx8ebD9e7tV8GwfZGJ2aW4fsbEtdHq3ldcjd8tmspv29Ls1OWCgz_K_y_JB3u-6L_kIgh99EvNXSLD2-b--b8rx5_9JX71il0UVADM9p31R0wBit-NNUAr9DUNREURNf2gGMAgUnG2grHfKUtiR9_tJUl-QW17D1yfAIkwsYkevNGN_pEb78AeNm-Dc) | 3 |
| [Personnages](https://mermaid.live/view#pako:eNqdWNtu2zAM_RXDz-sP5K1LV6xYhxVN-7QMgyKxiVBbcnUpFqT990myHetmx8lTYPJQpCmSh86hxJxAuShKEDcUbQWq16woljskEFYgioN9LArKVEFJ8fBjeNQSxB0ZnoFQRTm7I8Vth5JKULYtGKphgJlzwcNYkdSbjHSD8OtWcM1IpEAV3bIamPLkwHRdoA2tqNr_BLXjfmD_GhAUGIYHbp7loMFaCHPOd6pijYK64QKJfUZHAKndCr3DSmMMUkJOd4topUWv2nBeAWIGIhsqkM1TkCLUNGAybkIMxDYFUnGxD_PJVX9uJzGhKoGoehZVK1e0BqlQ3RRYmIiAXKtYoRsyKD6DS79u87jCXMBEAeAeH9-PZx7ftJWlDpcVkvICT9japcWUEzdc0iHtVrKj6oZieJZA0oju4R2qOREtM76cf3dCxiCS77r6euSVJ30xl3Y8NHs5d8zerJx1P87l_EvacKZl5pJ23KTrkltyhpGQN9GwsMIKsa1G2xgLb5o2UcNPvGAY9qqBqroo6okblvZQT9b3dyOgQSJXUC6MVcXVszQveEE8zqVXPEeXBhwM5YzzW1NOZhhd6trVc3dGpHJjJ5LlY7gzI_UC37m7T3ilExCQWNAmbPM3jZgylR5mzR3bAAmlSCnNgOSnRtQNjjrw_sxXcjyFO1uvG2vDc5lJ_ABCcoZsp17i6JUyMtFyXdqwNhxTP8G_TABLzlpav6RsetuwMx8N1RcfH1dX_ODtGYtuMbCIVbsPFB88AR1XBYv7etwQclB_f7Do635tyIG9nSLcf-JAA25c-O_ufPjaE6bhBJ722hJk4u6GkVYzim9nV5dU3GJ5HjsQZ4abYwctPy6SKWlN7aRIvPQGLbNluHYkW0eeWyTjfm7CvSPOynnLd0nSO_kEvKW7AfvLNV6a-N6ib0xrcd9R4Dh6IEmL_9bPx3EDb4Tm8s5PvbaX7vFstTSbSdZkGSVWXhm1ujGLjoFnBDWQ7nh0iWXAmKmdR4hJAmPTgDyt9ZPlzFNmHbFOR-k4NYluvCQ6_FhBpDXdk9wZmfMpKzEbJrYHG2mP8CC_RyYCPtJVGvFRNWk0cFYyXg7hJ5tWAv4SXiPKhk-agWTmoD0COw-eZm-OfbjBz4CecXZPRb_Xpftdl3_mOfJbaZZBvJFMoodemIN2zDUHeJzSc8Bu4ZkDDD5VppE9mc8Ei7khtLPpFLL8UpQ1CCMg9q-jw7pUOzDLuHlYlwRekK7U2oDWJQgrNIAK7bk2H9wCsFuoHfT-cV1-utOMD77aM1zayafBSNr_J7r_pDrx53-f9HIl) | 13 |
| [Pnj et générateur de pnj](https://mermaid.live/view#pako:eNqNVNtu4yAQ_RXE8_YH8hYlXanqqlo1eVtXKwITB9UGLwzdtZz8-wKxC7hJmyebM4e5nWEGyrUAuiAUzFqy2rC2UoQ8dZwM4YcQqZBIQX4-pqOzYB5EOoOQKLV6EOT7yLJopKqJYi0UwF4ai09ztGE5GDwaxiFzFyDrdhdQ7u_aGcYaWasWFGY4KNeSGpQAkxHrLOQBZH3AVZuQvxF5rItcd1r0274rC-iM3oO1vgcFbDWXrNkgQ2cLg4GGhY6VaAfGauWzx77AW43yLfIL-I-T5rVADtKiNuVlpRHGMChbsMjajnADDEEscW5wnUiG0zgJy50MOW24NvDJVKiOz4XILs7VDFgeZMt2DdwrNP2VEFHBV6nE1SkZK35jjYO5ipdDbQ1T9izFJ4VBoH6M02jOGlj55zO3IPxLAZ99kuR4vLvTQ3xWizHtYNucZ5ocdWZ-H_TAWCuxCiNeUsapD4TlNOwlI3sD03tOORSCLs7CRV85fpVeqppKfA-fSZkXW1qS-8tyLKa2f0hsKHrNHBr4LXTLpEoDlbpyC3tq8q-Kxm9FX266F-u-hTjp_BWXfiO0BeMBEVbyUFE8gN-L_lBRAXvmGqw8qfLbOoCe0LBeO1xLAzxuiEj98VzRU_TmY-hNr7iH0TjwyPmJj7t-hE__AQtcCCI) | 4 |
| [Monstres](https://mermaid.live/view#pako:eNqlWNtS5DYQ_RWXn3d_gDcys6S2stRSDDxlUikhNTMKsuSVZNgJ8O9p38Yt2RZ29gmm1ae7JfXlyK85NwLyiywHu5XsYFmx11l2bbTzYLPX-keWSe0zKbKbP4afIKSXRn8V2VUndd5KfcBFAT9bCeiqyJz8FwYYt8B8ZeHuVALBtpovzBbfH3dnwIMxCpjOpLvXTMmDBjFYOkp_Y_AfF4i2ksPGVNpHUtgFYfTg34yuOgP_OKMfMlcCCGISNwX64I-DBHeHJyP9iWyqPi3pq_pAyIFpDwqjBs2J5xfphCkI9sisdAULggDtgARRMufkM9yA5VCGTtAFlMwfT1eeesa7YR4hZH8CuCyYqh0qhXuCW9TQhwH1sxz-V4BhC2ZPl7z259D1LZ6qCG-6YAe4t4peoaks3a150WC_djAvC3CeFWWbBSAufbxQlWJYeCeZeGeZdorVwSSSsmiVx0mpDGcKE0NAvKJZAYFAgONWkmPuTTB9qHDD7g4TIA5vVz14zOhVodFy6PDnVWr7ss78AlB7rXXWI6ft2sLYjcLcWm24NE6GefjMVAWjRKirnNRSifUQH4DRUSOZDnHZ_bOz_qoUMB7mPX_5Ucnyg-Of9Nt0yR48ub0de0b_d0drXtbf7YNU2IR23FiIlh76og98PUmlVntxNWqJ-S2rm8G1EfJRJufG2E-TL09Sk94uGmvRjOingTb6mh0k3uZ3rU7pQJaljQgwv5o6m3NKF0WFnfi0viski-Jb14hWm-072MSZYmsHiy1Yi6kzbYfAr15q2DQaBeY9409hl2hlZHDVQmyT_EhHnDYWh9kt7gioWBl9GAkde4bLtlzi9MaVLadtCwW7inNwASuoHB7bxHTcGOenD2thv-LTHOr_j6txJG1BrAlifFm9L0ln-2SRtmMHneuGf_xuTVXGcV1XqqYn9TXvPJSJ0MZzphiwkVfP7AH85dRmeEgIP4pvV88pzlxNj9b35SGAT_fL-jXNwtkKqOPB2odnUEQYjZyOPirj3eSmErtxZNNxfNHcjmqCernCslx9ZI8Iuo5WGqMb8ljI3t4-fzav55fJRfSUoK-WUJWW4sUQwjygJ3OR8ibkarOgEaeb9zRQu8jXsDAPIOwu4WEgeZGLNiHezKx2d-3N1vuBlNInU2uaZc5FFl4Q5VLr7AxMbWxlWFuCJrQtkSaEvcXXR4o9iQq7QsJXw97iG2yE04odcZu3GBG2yPT23NujGx_B6BSY54Mp3-H1x1xsfgdjnhUX7JC1HwKnkzcCnplX5Ogsn1UfqFeiVPlUiwpTyUwCAoIz5m1TbqKa4-O6ncd2jCKE0YxJYWbyZdJdTBQuwvG_Hh5yhES5UQYwPTOox7cZHD2fVEuIUKOesNWi63wmgeOjnhkoTPjsm_x57JO5MK-dOrhm_i8asp1mMPtH5_Qa0E9WeQt_C1MwqQfmMfo8ktTuj_LPfd783ed_LcINvWSRdkQV1mDulgJIxS1RH33HSGrHj8ykcvBtIa1JWeisZv4pywvAB54U9Zfp133uj4DvHvyxzwU8MizsPSrtc7C1EBUUO5nKb6WFpuZa1W-3-_y9sYY-zO6kOYq9rQAl7ZfG7pN3J37_D95mAlA) | 20 |
| [Objets magiques](https://mermaid.live/view#pako:eNp9UttOwzAM_ZUoz-wH9jZtIE2AhLi8VUJeYkqkXIrjCKq2_07abfSyiUcfH9vHx26kChrlWkiknYGSwBVeiEcojdozOtH0oRDGszBaPN2PIWrDJvi9FncnNDIZX-akxp8J7yuZyqHnLTCWgepJBfrkBAEZro_AIQSL4AX1VYRxw5w89tVjwwoox1fmOijxjeykdQyJFI6l4dsj7fURYOMwMrhKKMKsTW94mUiVHhPdzJlXAh8t9Bb8Y5I70y_l2qDA4jbbv8x4cDgDYjqwYTsHNUZFpuoF_Km7XXot2na1Cs3koOtrB5nfvA0XNWfPF8RF86kn6-nu17U1s30gMeG7Dg6MHzbt5I2QDikDuv_QppD8mX-hyEEhNX5AslxkUpGftwczwUIdEu_y66jBmIH68FzIbuiWZ4SX2qsMMyXMyPHCp9c_wd0vuyQOBg) | 2 |
| [Règles du srd et guides](https://mermaid.live/view#pako:eNqtVstu2zAQ_BVC5-YHdLXRomgOQZJbVBQrcmsToEiBj7SC7X8vJcuV-ZBsITkJGs6KwxFnyUNBFcOiJAXqLYedhqaShDw7gZs9tBY1OfQAIVxawhl5-jG9IuOWK_mdka8jaqzmcucHGf6deK0yA7FHTtHnXzVII6AfXphJTwXpbEJR8MN-HfGIhAYDgKGhmreJmBekNxTcu1aaqJx1YJz0fgfGgk934JvjDJ9gh5_8rwmplRIIkrSuFtzskYWl9MJD6RoClKK0qar7DNpd6GvssdyK0B-zV9q-JjB2WGv1J8D2CMw_IzesVuESbu-tNqt60dgeEfiOYq2hqzbd7qrig7a6OgVrxbpQ3QY0W9Bj5qQsenXLnDG4AoyJYquBYgxlc9iPMLTARTwWrm2F7T39Y57n9qxxTQO6CzBg75xiKvaRG7ugkoYCs20u-NbKxfclawwQUMdxsNiY3KFDjseHB3WYO4fK8LxZKL5ku5z6fnykpOx0qv-bJuzGY2m2EZbXDW--bBLYhsxI3lxvKKMesFg_pLecUtqTt5Jt-mSRo0qIY-QGx3zScpRzAhNPM8SsjQsFUVzDFhSvKmPJOZ_LZUOCyjEpabZy9JmZzmG4NvStKoZnVfy8pOmSZ2c1_mKqAS6nWA8O3yIWX0jRoPYA6--Eh6qwe_Q3CP9SFQx_gxO28qTKXxd70BMEdMrZLddnJ8_Ux-eqOA1f83Ool05SD1vt0COuZWBxvGyO8Okfb1CQrw) | 12 |
| [Campagnes](https://mermaid.live/view#pako:eNqtVclu2zAQ_RVC5-YHfCuyAEGbNAt6E1Aw5FhhIZICFweG7H_vaKEkUpbSODny8Q1nezOsM6Y5ZBuSgbkStDBU5oqQSyorKgpF6uZEiFCOCE4efoxHb8Hc8vEMXDih1S0nNz3LOiNUQRSVEAEcLDOiatgR7l4hMEF5iTB13kYUoXbCwSWGTH73XpyQgExZEWaAOuDfXXrhKz5eHKf53YF8AbOSJeuJk7ROJc9eqaHMNeDAG_3_1UKddP8M1mIVPu4fy4Nxp36qku6B_0qqKlwZ1996KanZR1gh77UD-4mSPnq8-ngmlbZiroRZzDPNzBTSAlxst4L50sXZGXijZtKuQuzA3FdsEsuL1iVQhdQd0BL4F4gLHZzR2SiqEL9OylFqRmdVU6GDbRTXimmv3Dnqtp0s_6dT7w_3rFFn1XTI5k4ru54UBGoSv-wsE7TlzlpHDoeLC12ne2IzqVhLD2NPDnqBPy6GtffDIpg5SPjdkKWsRmh9AIEwKnzNbWN48rFTNLX02qi0pfBDen2QU4NBa7Fm06dD2zfT9jYm4WLZYOh73LE6ki31zsAfriXFVT3IIRHbKncy7Yu87BvJJBgEePPl1nnW_Xl4yDMOW4qbK0dSjr9xAyIBV7r27koYYO1MtdSfT3l2bF9DH_p5rxjCznhApJud_i_v4eM_-kSujg) | 7 |

Pour une vue complète avec groupes colorés et notes de colonnes : coller [`socle/diagrammes/socle.dbml`](socle/diagrammes/socle.dbml) dans [dbdiagram.io](https://dbdiagram.io/d) ou l'importer dans [drawdb.app](https://drawdb.app).

Les relations vers `Locale` (tables `*Translation`) et `Edition` (contenu de jeu) ne sont pas dessinées : elles partent de presque toutes les tables.

Après modification du schéma, régénérer le DBML et le tableau de liens ci-dessus :

```bash
python docs/modelisation/outils/prisma-vers-diagrammes.py prisma/schema docs/modelisation/socle/diagrammes
```

## Seed

Les données sources sont dans `prisma/data/2014/` (`en/`, `fr/`, `custom/`) : fichiers du SRD et contenu propre à l'application. Les fichiers `custom-*` (sous-classes, sous-races, traits et historiques supplémentaires) priment sur le SRD dans leur langue ; leurs entrées absentes du SRD sont importées comme contenu maison (`source = HOMEBREW`). `custom/` contient aussi la présentation des classes et races, les tables du générateur de PNJ, les libellés des monstres et les guides.

```bash
npx prisma db seed
```

Options (après `--`) :

- `--only <domaines>` parmi `base, referentiels, equipement, maitrises, sorts, classes, races, historiques, presentation, pnj, monstres, objets-magiques, regles, guides` ;
- `--classes wizard,fighter` : classes à importer ;
- `--reset-guides` : réécrit les guides déjà en base (sans cette option, seules les pages absentes sont créées, pour ne pas écraser ce qui a été rédigé dans Directus).

Le seed est idempotent : le relancer met les données à jour sans créer de doublons. Sur une base vierge, il dure un peu plus d'une minute.

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
