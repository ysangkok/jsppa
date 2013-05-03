from __future__ import print_function
import ast

class v(ast.NodeVisitor):
   def visit_Str(self, node):
     print(node.s)
   def generic_visit(self, node):
     print( type(node).__name__)
     ast.NodeVisitor.generic_visit(self, node)

node = ast.parse(open("06").read())

v().visit(node)
