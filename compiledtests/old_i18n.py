from __future__ import print_function

import ast

import urllib.request
langs = str(urllib.request.urlopen("http://localhost:8800/jsppa/languages.php").read(),'utf-8')
import json
texts = json.loads(langs)["texts"]["english"]

import sys
sys.path.append( "scanf-1.2" )

from scanf import sscanf, IncompleteCaptureError

def process(strs, oldlines):
	for pair in strs:
		try:
			(sourcestr, lineno, colno) = pair
			lineno -= 1
			def literalin(i18nstr): return i18nstr[1] in sourcestr
			def scanfmatch(x):
				if "%s" not in x[1]: return False
				try:
					match = sscanf(sourcestr,x[1])
					#print("template:" + x[1], "source:" + sourcestr)
					#print("FOUND MATCH", match)
					return True
				except IncompleteCaptureError:
					pass
				return False

			res = list(filter(lambda x: literalin(x) or scanfmatch(x),texts.items()))
			if len(res) > 0:
				m = max(res, key=lambda i18nstr: len(i18nstr[0]))
				if m[0] in ["strhelpicon"]: continue # applang maybe?
				#print("\"{0}\" contains {1} (\"{2}\")".format(sourcestr, m[0], m[1]))
				#print(lineno, "\t", oldlines[lineno])
				newoldline = ""
				newoldline += oldlines[lineno][0:colno+1]
				temp = oldlines[lineno][colno+1:colno+len(sourcestr)+1]
				#print("searching in", temp)
				strchar = oldlines[lineno][colno:colno+1]
				for febn in ["find_element_by_name(","find_element_by_xpath(","find_element_by_id("]:
				  before = oldlines[lineno][colno-len(febn):colno]
				  if before == febn:
				    if m[1] not in ["Logout","Create","Alter"] and "xpath" not in febn:
				      raise StopIteration()
				if '%s' in m[1]:
				  newoldline += strchar + " + (t['" + m[0] + "'] % " + repr(sscanf(temp,m[1])) + ") + " + strchar
				else:
				  newoldline += temp.replace(m[1] , strchar + " + t['" + m[0] + "'] + " + strchar)
				newoldline += oldlines[lineno][colno+len(sourcestr)+1:]
				oldlines[lineno] = newoldline
		except StopIteration:
			pass
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

for f in map(lambda x: x.zfill(2), map(str,range(1,13))):
#for f in map(lambda x: x.zfill(2), map(str,range(1,2))):
  node = ast.parse(open(f).read())
  allnames(open(f).readlines(),open(f + ".new",'w')).visit(node)
