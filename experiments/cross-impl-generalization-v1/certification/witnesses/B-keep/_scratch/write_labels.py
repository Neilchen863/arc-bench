import json
from pathlib import Path
W=Path('/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/certification/witnesses/B-keep')
OUT=Path('/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1/certification/labels-provisional.jsonl')
SC={'REQ-2.2':['autosave_on_close','persist_after_reload'],'REQ-4.1':['search_title_content_highlight','suggested_label_filter']}
S0={'REQ-2.2':('S0-VIOLATED','Exact names absent: creation button is "Take a note…" (with ellipsis, not exactly "Take a note"); editor dialog is "New note" (not "Note editor"); content textbox is "Note text" (not "Content"); notes are role=article named by title (not role=region). Present exactly: textbox "Title", button "Close".'),
    'REQ-4.1':('S0-VIOLATED','Exact names absent: searchbox is "Search notes" (not "Search"); suggestion panel is region "Filter by label" (no "Suggested filters" region); highlights are unnamed <mark> elements (no "Highlight st" region). Present exactly: button "Reminders" in the panel, button "Notes" in navigation.')}
def obs(v,req):
    r={}
    for s in SC[req]:
        r[s]=[]
        for k in (1,2,3):
            d=json.load(open(W/v/s/f'rep{k}'/'obligations.json'))
            e={o:x['holds'] for o,x in d['obligations'].items()}
            e['_no_error']=d['error'] is None and not d['pageErrors']
            r[s].append(e)
    return r
units=[('REQ-2.2','correct',None,'SATISFIED','All K22-O1..O6 hold 3/3 in both scenarios. Close (footer button, no Save control exists) dismisses the editor and creates exactly one note (UI and API); lines rendered on separate visual lines (pre-wrap, rect check + screenshot); note persists after reload.'),
('REQ-2.2','K22-D1','K22-O2','VIOLATED','Target K22-O2 fails 3/3 in both scenarios (0 cards, 0 API notes after Close); K22-O3/O4/O6 fail as consequences; parent passes 3/3; app starts, editor reachable, no page errors.'),
('REQ-2.2','K22-D2','K22-O6','VIOLATED','Target K22-O6 fails 3/3 (note gone after reload, 0 API notes). K22-O2 also fails 3/3 because the checklist requires exactly one API note (card visible but API count 0); O1/O3/O4 hold. Parent passes 3/3; app starts; no page errors.'),
('REQ-4.1','correct',None,'SATISFIED','All K41 obligations hold 3/3. Highlights are <mark> with only "St"/"st", bg rgb(251,188,4) vs white (V-HL bgDiff 251) and visible in screenshots. Judgement call for human review: the suggested-filters panel is headed "Filter by label" (treated as same meaning under R-NAME/R-RESULT). Clearing used select-all+Backspace in the searchbox (scenario 3) and the "Clear search" control (scenario 4), then Notes.'),
('REQ-4.1','K41-D1','K41-O2','VIOLATED','Target K41-O2 fails 3/3 (content-only match "Reading plan" not shown); K41-O4 fails as a consequence (no card to highlight); O1/O3/O5 hold; suggested_label_filter fully passes 3/3. Parent passes 3/3; no page errors.'),
('REQ-4.1','K41-D2','K41-O7','VIOLATED','Target K41-O7 fails 3/3 (unlabeled Movie list shown under the Reminders suggested filter, 2 cards); P1/O6/O8 hold; search_title_content_highlight fully passes 3/3. Parent passes 3/3; no page errors.')]
with open(OUT,'a') as f:
    for req,v,tgt,lab,notes in units:
        f.write(json.dumps({'unit_id':f'B-keep.{req}.{v}','app':'keep','requirement_id':req,'variant_id':v,
          'parent_id':None if v=='correct' else f'B-keep.{req}.correct','target_obligation':tgt,'S1_label':lab,
          'S0_label':S0[req][0],'S0_reason':S0[req][1],'obligations_by_repeat':obs(v,req),'evidence_path':str(W/v),
          'certifier':'llm-certifier-v1, provisional: requires human adjudication','notes':notes})+'\n')
