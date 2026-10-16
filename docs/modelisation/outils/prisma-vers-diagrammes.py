"""Convertit le dossier de schéma Prisma multi-fichiers en :
 - un DBML global (dbdiagram.io / drawdb.app), un TableGroup par fichier,
   écrit dans <dossier_sortie>/socle.dbml ;
 - des liens mermaid.live (vue d'ensemble + un diagramme par domaine), affichés
   au format tableau Markdown, à recopier dans docs/modelisation/README.md.
Les relations vers Locale et Edition sont omises des diagrammes (elles
partent de presque toutes les tables) et signalées en note.

Usage: python prisma-vers-diagrammes.py <dossier_prisma> <dossier_sortie>
"""
import base64, json, os, re, sys, zlib

src_dir, out_dir = sys.argv[1:3]

SCALARS = {"Int": "int", "String": "varchar", "Boolean": "boolean", "DateTime": "timestamp",
           "Json": "jsonb", "Decimal": "decimal"}
HIDDEN_TARGETS = {"Locale", "Edition"}

enums, models, model_file, files = {}, {}, {}, []
for fname in sorted(os.listdir(src_dir)):
    if not fname[0].isdigit() or not fname.endswith(".prisma"):
        continue
    lines = open(os.path.join(src_dir, fname), encoding="utf-8").read().splitlines()
    title = next((l[3:].strip() for l in lines[1:6] if l.startswith("// ") and not l.startswith("// ===")
                  and not l.startswith("// ---")), fname)
    title = re.sub(r"^BROUILLON — ", "", title).split(" (")[0].strip()
    title = title[0] + title[1:].lower() if title.isupper() else title
    files.append((fname, title))
    i = 0
    while i < len(lines):
        m = re.match(r"^(model|enum) (\w+) \{", lines[i].strip())
        if m:
            kind, name = m.groups()
            body = []
            i += 1
            while lines[i].strip() != "}":
                body.append(lines[i].strip())
                i += 1
            if kind == "enum":
                enums[name] = [b.split("//")[0].strip() for b in body if b and not b.startswith("//")]
            else:
                models[name] = body
                model_file[name] = fname
        i += 1

def parse_model(body):
    fields, rels, cpk, uniques = [], [], [], []
    for b in body:
        if not b or b.startswith("//"):
            continue
        if b.startswith("@@"):
            m = re.match(r"@@id\(\[(.+)\]\)", b)
            if m: cpk = [x.strip() for x in m.group(1).split(",")]
            m = re.match(r"@@unique\(\[(.+)\]\)", b)
            if m: uniques.append([x.strip() for x in m.group(1).split(",")])
            continue
        code, _, comment = b.partition("//")
        parts = code.split()
        fname, ftype, attrs = parts[0], parts[1], " ".join(parts[2:])
        base = ftype.rstrip("?[]")
        if base not in models and base not in SCALARS and base not in enums:
            continue  # relation vers un modèle hors socle (User) : non dessinée
        if base in models:
            m = re.search(r"fields: \[(\w+)\], references: \[(\w+)\]", attrs)
            if m:
                rels.append((m.group(1), base, m.group(2)))
            continue
        fields.append(dict(name=fname, type=base, optional=ftype.endswith("?"), list=ftype.endswith("[]"),
                           pk=attrs.startswith("@id"), unique="@unique" in attrs,
                           incr="autoincrement" in attrs,
                           default=re.search(r"@default\(([^()]*(?:\([^)]*\))?)\)", attrs),
                           comment=comment.strip()))
    return dict(fields=fields, rels=rels, cpk=cpk, uniques=uniques)

P = {n: parse_model(b) for n, b in models.items()}
is_translation = lambda n: n.endswith("Translation")

# ------------------------------------------------------------------ DBML
def q(s): return s.replace("\\", "\\\\").replace("'", "\\'")
out = ["// Socle des données de jeu (SRD) — dungeon-desk — BROUILLON",
       "// Généré depuis docs/modelisation/socle/*.prisma (ne pas éditer à la main).",
       "// Relations vers Locale (tables *Translation) et Edition (contenu de jeu)",
       "// omises pour la lisibilité : voir les colonnes localeCode / editionId.", ""]
for e, vals in enums.items():
    out.append(f"Enum {e} {{")
    out += [f"  {v}" for v in vals]
    out.append("}\n")
for n, p in P.items():
    out.append(f"Table {n} {{")
    for f in p["fields"]:
        t = SCALARS.get(f["type"], f["type"]) + ("[]" if f["list"] else "")
        if f["list"]:
            t = f'"{t}"'
        s = []
        if f["pk"]: s.append("pk")
        if f["incr"]: s.append("increment")
        if f["unique"]: s.append("unique")
        if not f["optional"] and not f["pk"]: s.append("not null")
        if f["default"] and not f["incr"]:
            d = f["default"].group(1)
            s.append(f"default: `{d}`" if "(" in d else f"default: {d}" if d.isdigit() or d in ("true", "false") else f"default: '{d}'")
        if f["comment"]: s.append(f"note: '{q(f['comment'])}'")
        out.append(f"  {f['name']} {t}" + (f" [{', '.join(s)}]" if s else ""))
    if p["cpk"] or p["uniques"]:
        out.append("  indexes {")
        if p["cpk"]: out.append(f"    ({', '.join(p['cpk'])}) [pk]")
        for u in p["uniques"]: out.append(f"    ({', '.join(u)}) [unique]")
        out.append("  }")
    if n in HIDDEN_TARGETS:
        out.append(f"  Note: 'Relations vers {n} non dessinées (référencée par presque toutes les tables).'")
    out.append("}\n")
for n, p in P.items():
    keyset = {f["name"] for f in p["fields"] if f["pk"] or f["unique"]}
    if len(p["cpk"]) == 1: keyset |= set(p["cpk"])
    for col, target, ref in p["rels"]:
        if target in HIDDEN_TARGETS:
            continue
        out.append(f"Ref: {n}.{col} {'-' if col in keyset else '>'} {target}.{ref}")
out.append("")
colors = ["#7F8C8D", "#3498DB", "#D35400", "#2C3E50", "#24BAB1", "#8E44AD", "#27AE60", "#E67E22", "#C0392B"]
for k, (fname, title) in enumerate(files):
    tables = [n for n in P if model_file[n] == fname]
    if not tables:
        continue
    out.append(f'TableGroup "{title}" [color: {colors[k % len(colors)]}] {{')
    out += [f"  {t}" for t in tables]
    out.append("}\n")
open(os.path.join(out_dir, "socle.dbml"), "w", encoding="utf-8").write("\n".join(out))

# --------------------------------------------------------------- Mermaid
MID = lambda n: "DndClass" if n == "Class" else n  # "class" est un mot-clé Mermaid

def entity(n, detailed):
    head = f"  {MID(n)}" + (f'["{n}"]' if MID(n) != n else "")
    if not detailed:
        return [head + " {", "  }"] if False else [head]
    p = P[n]
    fk = {r[0] for r in p["rels"]}
    rows = [head + " {"]
    for f in p["fields"]:
        keys = []
        if f["pk"] or f["name"] in p["cpk"]: keys.append("PK")
        if f["name"] in fk: keys.append("FK")
        if f["unique"] and "PK" not in keys: keys.append("UK")
        t = SCALARS.get(f["type"], "enum").replace("varchar", "string") + ("_list" if f["list"] else "")
        rows.append(f"    {t} {f['name']}" + (f" {','.join(keys)}" if keys else ""))
    rows.append("  }")
    return rows

def rel_lines(n):
    p = P[n]
    by = {f["name"]: f for f in p["fields"]}
    keyset = {f["name"] for f in p["fields"] if f["pk"] or f["unique"]}
    if len(p["cpk"]) == 1: keyset |= set(p["cpk"])
    for col, target, ref in p["rels"]:
        if target in HIDDEN_TARGETS:
            continue
        left = "|o" if by[col]["optional"] else "||"
        right = "o|" if col in keyset else "o{"
        yield target, f"  {MID(target)} {left}--{right} {MID(n)} : {col}"

def link(code):
    state = {"code": code, "mermaid": json.dumps({"theme": "default", "er": {"layoutDirection": "LR"}}),
             "autoSync": True, "updateDiagram": True}
    payload = base64.urlsafe_b64encode(zlib.compress(json.dumps(state).encode("utf-8"), 9)).decode().rstrip("=")
    return "https://mermaid.live/view#pako:" + payload

links = []
# Vue d'ensemble : entités non traduction, sans colonnes, relations dédoublonnées
core = [n for n in P if not is_translation(n) and n not in HIDDEN_TARGETS]
seen, mm = set(), ["erDiagram", '  DndClass["Class"]']
for n in core:
    for target, line in rel_lines(n):
        if target in core and (target, n) not in seen:
            seen.add((target, n))
            mm.append(line)
links.append(dict(title="Vue d'ensemble (sans traductions ni colonnes)", url=link("\n".join(mm)), tables=len(core)))

for fname, title in files:
    tables = [n for n in P if model_file[n] == fname and n not in HIDDEN_TARGETS]
    if not tables:
        continue
    mm = ["erDiagram"]
    externals = set()
    for n in tables:
        mm += entity(n, True)
    for n in tables:
        for target, line in rel_lines(n):
            if target not in tables:
                externals.add(target)
            mm.append(line)
    # Tables d'autres domaines pointant vers celui-ci : non dessinées (restent dans leur domaine)
    for e in sorted(externals):
        mm.append(f"  {MID(e)}" + (f'["{e}"]' if MID(e) != e else "") + ' {\n    string autre_domaine\n  }')
    links.append(dict(title=title, url=link("\n".join(mm)), tables=len(tables)))

print("| Domaine | Tables |")
print("|---|---|")
for l in links:
    if l["tables"] > 1:
        print(f"| [{l['title']}]({l['url']}) | {l['tables']} |")
