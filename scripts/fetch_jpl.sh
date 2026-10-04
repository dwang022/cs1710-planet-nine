#!/usr/bin/env bash
# Pull all small bodies with semi-major axis > 30 AU from the JPL Small-Body Database.
set -euo pipefail
OUT="data/raw/jpl_sbdb_a_gt_30.json"
FIELDS="spkid,full_name,pdes,name,class,neo,pha,a,e,i,om,w,ma,tp,q,ad,per_y,n,epoch,epoch_mjd,H,G,diameter,albedo,rot_per,moid,condition_code,n_obs_used,n_del_obs_used,data_arc,first_obs,last_obs,producer,rms,equinox,two_body"
curl -sS -m 300 -G "https://ssd-api.jpl.nasa.gov/sbdb_query.api" \
  --data-urlencode "fields=$FIELDS" \
  --data-urlencode 'sb-cdata={"AND":["a|GT|30"]}' \
  --data-urlencode 'full-prec=1' \
  -o "$OUT"
python3 - "$OUT" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
print("rows:",d.get("count"),"fields:",len(d.get("fields",[])))
PY
