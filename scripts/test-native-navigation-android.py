import subprocess,time,xml.etree.ElementTree as E,re,json
from pathlib import Path
adb=str(Path.home()/'Library/Android/sdk/platform-tools/adb');device='emulator-5554'
out=Path('.impeccable/review/native/navigation');out.mkdir(parents=True,exist_ok=True)
def run(*a):return subprocess.check_output([adb,'-s',device,*a],text=True)
def tree():
 s=run('exec-out','uiautomator','dump','/dev/tty');return [n.attrib for n in E.fromstring(s[s.index('<?xml'):s.index('</hierarchy>')+12]).iter('node')]
def find(label,nodes):return next((n for n in nodes if n.get('content-desc')==label),None)
def wait(label,selected=None):
 until=time.monotonic()+25
 while time.monotonic()<until:
  ns=tree();n=find(label,ns)
  if n and (selected is None or n.get('selected')==str(selected).lower()):
   if selected is not None:
    heading=any(v.get('text')==label and int(re.findall(r'\d+',v['bounds'])[1])<1000 for v in ns)
    if not heading:
     time.sleep(.25)
     continue
   return n
  time.sleep(.25)
 raise AssertionError('Missing target/state: '+label)
def tap(label):
 n=wait(label);x,y,x2,y2=map(int,re.findall(r'\d+',n['bounds']));run('shell','input','tap',str((x+x2)//2),str((y+y2)//2))
def shot(name):
 (out/(name+'.png')).write_bytes(subprocess.check_output([adb,'-s',device,'exec-out','screencap','-p']))
checks=[]
for role,home,second in [('player','Discover','My games'),('organizer','Overview','Sessions')]:
 run('shell','am','start','-W','-a','android.intent.action.VIEW','-d',f'exp://127.0.0.1:8081/--/navigation-preview/{role}/home')
 wait(home,True)
 for label in [second,'Profile',home]:
  tap(label);wait(label,True);checks.append(role+': '+label+' selected')
 tap('Notifications');wait('Back');assert any(n.get('text')=='Session updates will appear here.' for n in tree())
 tap('Back');wait(home,True);checks.append(role+': notification round trip')
 shot(role+'-android')
 print('PASS '+role+' tabs and notification Back',flush=True)
(out/'android-report.json').write_text(json.dumps({'checks':checks,'passed':True,'scope':'Real shared tab navigator in development fixture'},indent=2)+'\n')
