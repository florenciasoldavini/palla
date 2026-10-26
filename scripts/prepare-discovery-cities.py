# GeoNames reference catalog importer. Python 3, Supabase CLI with a linked project.
# Downloads go to a temporary directory. SQL files can be applied through the
# Supabase connector or `supabase db query --linked --file <batch.sql>`.
# CC BY 4.0: https://www.geonames.org/export/ (attribution shown in the city picker).
import argparse,json,zipfile,unicodedata,urllib.request,tempfile
from pathlib import Path
parser=argparse.ArgumentParser(description="Prepare GeoNames cities500 SQL import batches")
parser.add_argument("--output",required=True,help="Directory for upsert SQL batches")
args=parser.parse_args()
source=Path(tempfile.mkdtemp(prefix="palla-geonames-"))
for filename in ["cities500.zip","admin1CodesASCII.txt","countryInfo.txt"]:
 urllib.request.urlretrieve("https://download.geonames.org/export/dump/"+filename,source/filename)
countries={}
for line in (source/'countryInfo.txt').read_text().splitlines():
 if line and not line.startswith('#'):
  p=line.split('\t');countries[p[0]]=p[4]
admins={p[0]:p[1] for line in (source/'admin1CodesASCII.txt').read_text().splitlines() if len(p:=line.split('\t'))>=2}
rows=[]
with zipfile.ZipFile(source/'cities500.zip') as z:
 for line in z.read('cities500.txt').decode().splitlines():
  p=line.split('\t')
  if p[6]!='P' or p[7] in ['PPLH','PPLQ','PPLW'] or p[8] not in countries:continue
  def norm(s):return ''.join(c for c in unicodedata.normalize('NFKD',s.casefold()) if not unicodedata.combining(c))
  # Alias terms provide accent-insensitive and local/English name matches.
  terms=list(dict.fromkeys(norm(s) for s in [p[1],p[2],*p[3].split(',')] if s))
  rows.append([int(p[0]),p[1],admins.get(p[8]+'.'+p[10],''),p[8],countries[p[8]],float(p[4]),float(p[5]),int(p[14]),'|'.join(terms)[:8000]])
out=Path(args.output);out.mkdir(exist_ok=True)
for i in range(0,len(rows),2000):
 payload=json.dumps(rows[i:i+2000],ensure_ascii=False,separators=(',',':')).replace("'","''")
 sql="insert into private.discovery_cities (id,name,region,country_code,country,latitude,longitude,population,search_names) select (v->>0)::integer,v->>1,v->>2,v->>3,v->>4,(v->>5)::double precision,(v->>6)::double precision,(v->>7)::bigint,v->>8 from jsonb_array_elements('"+payload+"'::jsonb) v on conflict(id) do update set name=excluded.name,region=excluded.region,country_code=excluded.country_code,country=excluded.country,latitude=excluded.latitude,longitude=excluded.longitude,population=excluded.population,search_names=excluded.search_names;"
 (out/f'{i//2000:04}.sql').write_text(sql)
print(len(rows), 'cities;',len(list(out.glob('*.sql'))),'batches')
