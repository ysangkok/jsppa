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

sys.path.append( "scanf-1.2" )

from scanf import sscanf, IncompleteCaptureError

def process(strs, oldlines):
	modifiedlines = {}
	skipped = 0
	for pair in strs:
		try:
			(sourcestr, lineno, colno) = pair
			lineno -= 1
			#oldlines[lineno] = oldlines[lineno].replace("\\\"" , '"')
			if sourcestr not in oldlines[lineno]:
			  continue
			if lineno in modifiedlines:
			  colno += modifiedlines[lineno]
			def literalin(i18nstr):
			  return i18nstr[1] in sourcestr
			def scanfmatch(x):
				if "%s" not in x[1]: return False
				#if x[1].startswith("Are you sure you want to vacuum all tables in database"): print(x)
				try:
					match = sscanf(sourcestr,x[1])
					return True
				except IncompleteCaptureError:
					pass
				return False

			res = list(filter(lambda x: literalin(x) or scanfmatch(x),texts.items()))
			#if sourcestr.startswith("Are you sure you want to vacuum all tables in database"): print(sourcestr, oldlines[lineno],res)
			notReplaced = True
			while notReplaced and len(res) > 0:
				m = max(res, key=lambda i18nstr: len(i18nstr[1]))
				newoldline = ""
				newoldline += oldlines[lineno][0:colno+1]
				temp = oldlines[lineno][colno+1:colno+len(sourcestr)+1]
				for febn in ["find_element_by_name(","find_element_by_xpath(","find_element_by_id("]:
				  before = oldlines[lineno][colno-len(febn):colno]
				  if before == febn:
				    if r"^" + m[1] + "[\s\S]*$" == sourcestr:
				      pass
				    elif "'" + m[1] + "'" in sourcestr and "xpath" in febn:
				      pass
				    else:
				      print("dropping str " + sourcestr)
				      raise StopIteration()
				strchar = '"'
				if '%s' in m[1]:
				  try:
				    newoldline += strchar + " + (t['" + m[0] + "'] % " + repr(sscanf(temp,m[1])) + ") + " + strchar
				  except IncompleteCaptureError as e:
				    res.remove(m)
				    continue
				    #raise e
				else:
				  replaced = temp.replace(m[1] , strchar + " + t['" + m[0] + "'] + " + strchar)
				  newoldline += replaced
				newoldline += oldlines[lineno][colno+len(sourcestr)+1:]
				modifiedlines[lineno] =   len(newoldline)-len(oldlines[lineno])
				oldlines[lineno] = newoldline
				notReplaced = False
		except StopIteration:
			pass
	print("skipped:", skipped)
	return oldlines

class allnames(ast.NodeVisitor):
   def __init__(self, oldlines, newfile):
     self.newfile = newfile
     self.oldlines = oldlines
   def visit_Module(self, node):
     self.names = set()
     self.generic_visit(node)
     oldlines = process(self.names, self.oldlines)
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
t = json.loads(langs)["texts"]["english"]""".split("\n")):
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
    allnames(org.readlines(),new1).visit(node)
#for i in range(1,2):
#  with open(f+".new") as new1:
#    with open(f + ".new.new",'w') as new2:
#      allnames(new1.readlines(),new2).visit(node)
#  shutil.move(f+".new.new", f+".new")

import os
os.system("for i in `seq -w 1 12`; do sed 's/english/japanese/gi' < $i.new > $i.new.jap; done")
