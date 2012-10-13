from __future__ import print_function
import shutil
import ast
import sys
import json
import urllib.request

f = sys.argv[1]
orgf = open(f).readlines()
print(orgf[0])

langs = str(urllib.request.urlopen("http://localhost:8800/jsppa/languages.php").read(),'utf-8')
texts = json.loads(langs)["texts"]["english"]
del texts["strasterisk"]
del texts["strhelpicon"]
del texts["strpercent"]

#sys.path.append( "scanf-1.2" )

#from scanf import sscanf, IncompleteCaptureError
"""
from parse import parse
def sscanf(x,y):
	res = parse(y.replace("%s","{}"), x)
	if res is not None:
		return res.fixed
	else:
		return None
"""
from acts import scanf
sscanf = lambda x,y: scanf(y,x)

def process(strs, oldlines):
	modifiedlines = {}
	skipped = 0
	for pair in strs:
		try:
			(sourcestr, lineno, colno) = pair
			if "autovacuum setup for table" in sourcestr: continue
			lineno -= 1
			if sourcestr.startswith("^"):
				print(pair, oldlines[lineno])
				#import pdb; pdb.set_trace()
			o = oldlines[lineno]
			oldlines[lineno] = oldlines[lineno].replace("\\\"" , '"')
			#if oldlines[lineno] != o:
			#	oldlines[lineno] = oldlines[lineno].replace(r"[\\s\\S]$", "?$") # should actually be \\? but we want the match
			#	oldlines[lineno] = oldlines[lineno].replace("assertRegexpMatches","assertEqual")
			#	oldlines[lineno] = oldlines[lineno].replace(r'''"^''', '"')
			#	oldlines[lineno] = oldlines[lineno].replace(r'''$"''', '"')

			#	sourcestr = sourcestr.replace("\\\"" , '"')
			#	sourcestr = sourcestr.replace(r"[\\s\\S]$", "?$") # should actually be \\? but we want the match
			#	sourcestr = sourcestr.replace("assertRegexpMatches","assertEqual")
			#	sourcestr = sourcestr.replace(r'''"^''', '"')
			#	sourcestr = sourcestr.replace(r'''$"''', '"')
			#	if "Are you sure" in oldlines[lineno]: print("BUGEXIT", sourcestr.strip(), oldlines[lineno].strip())
			#if "Are you sure you want to vacuum all tables in database" in oldlines[lineno]: print(sourcestr.strip(), oldlines[lineno].strip())
			if True:
#			i = 0
#			while True:
#			  if lineno == 0:
#			    print("lo" , lineno)
#			    raise StopIteration()
			  if sourcestr not in oldlines[lineno]:
#			    lineno -= 1
#			    i += 1
			    continue
#			  else:
#			    print("i", i)
#			    break
			if lineno in modifiedlines:
			  (othercolno, offset) = modifiedlines[lineno]
			  if othercolno < colno: colno += offset
			def literalin(i18nstr):
			  return i18nstr[1] in sourcestr
			def scanfmatch(x):
				if "%s" not in x[1]: return False
				#if x[1].startswith("Are you sure you want to vacuum all tables in database"): print(x)
				match = sscanf(sourcestr,x[1])
				return match is not None

			res = list(filter(lambda x: literalin(x) or scanfmatch(x),texts.items()))
			#print("res" , res)
			#if sourcestr.startswith("Are you sure you want to vacuum all tables in database"): print(sourcestr, oldlines[lineno],res)
			notReplaced = True
			while notReplaced and len(res) > 0:
				m = max(res, key=lambda i18nstr: len(i18nstr[1]))
				#print("chose", m)
				newoldline = ""
				newoldline += oldlines[lineno][0:colno+1]
				temp = oldlines[lineno][colno+1:colno+len(sourcestr)+1]
				for febn in ["find_element_by_name(","find_element_by_xpath(","find_element_by_id("]:
				  before = oldlines[lineno][colno-len(febn):colno]
				  if before == febn:
				    if r"^" + m[1] + "[\s\S]*$" == sourcestr:
				      print("YES", sourcestr)
				      pass
				    elif "'" + m[1] + "'" in sourcestr and "xpath" in febn:
				      pass
				    else:
				      print("dropping str " + sourcestr)
				      raise StopIteration()
				strchar = '"'
				if '%s' in m[1]:
				    #print("m", m)
				    match = sscanf(temp,m[1])
				    #print(temp, match)
				    if match is None:
				      res.remove(m)
				      print("cont 3")
				      continue
				    newoldline += strchar + " + (t['" + m[0] + "'] % " + repr(match) + ") + " + strchar
				else:
				  replaced = temp.replace(m[1] , strchar + " + t['" + m[0] + "'] + " + strchar)
				  newoldline += replaced
				newoldline += oldlines[lineno][colno+len(sourcestr)+1:]
				modifiedlines[lineno] =  (colno, len(newoldline)-len(oldlines[lineno]))
				oldlines[lineno] = newoldline
				notReplaced = False
		except StopIteration:
			pass
	print("skipped:", skipped)
	return oldlines

class allnames(ast.NodeVisitor):
   def __init__(self, oldlines, newfile, insert=False):
     self.newfile = newfile
     self.oldlines = oldlines
     self.insert = insert
   def visit_Module(self, node):
    self.names = set()
    self.generic_visit(node)
    oldlines = process(self.names, self.oldlines)
    if self.insert:
     oldlines.insert(0, "# -*- coding: utf-8 -*-\n")
     for x in reversed("""
import sys
if sys.version_info[0] < 3:
  from urllib2 import urlopen
  langs = urlopen("http://localhost:8800/jsppa/languages.php").read()
else:
  from urllib.request import urlopen
  langs = str(urlopen("http://localhost:8800/jsppa/languages.php").read(),'utf-8')
import json
ke = "__LANGUAGE__";
if ke == "__" + "LANGUAGE__": ke = "english"

orgeng = json.loads(langs)["texts"]["english"]
orgcho = json.loads(langs)["texts"][ke]
for (k,v) in orgeng.items():
  if not orgcho.has_key(k):
    orgcho[k] = v

t = orgcho

""".split("\n")):
       oldlines.insert(5,x + "\n")

    self.newfile.write(''.join(oldlines))
    self.newfile.close()
   def visit_Str(self, node):
     self.names.add((node.s, node.lineno, node.col_offset))

#for f in map(lambda x: x.zfill(2), map(str,range(1,13))):
#for f in map(lambda x: x.zfill(2), map(str,range(1,2))):
node = ast.parse(open(f).read())
with open(f) as org:
  with open(f + ".new",'w') as new1:
    allnames(org.readlines(),new1,True).visit(node)
#for i in range(1,2):
#  with open(f+".new") as new1:
#    with open(f + ".new.new",'w') as new2:
#      allnames(new1.readlines(),new2).visit(node)
#  shutil.move(f+".new.new", f+".new")

import os
os.system("for i in `seq -w 1 12`; do sed 's/__LANGUAGE__/japanese/gi' < $i.new > $i.new.jap; done")
