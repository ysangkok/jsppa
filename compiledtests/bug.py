import ast
import sys
import tokenize

from unparse import Unparser

def roundtrip(filename, output=sys.stdout):
    with open(filename, "rb") as pyfile:
        encoding = tokenize.detect_encoding(pyfile.readline)[0]
    with open(filename, "r", encoding=encoding) as pyfile:
        source = pyfile.read()
    tree = compile(source, filename, "exec", ast.PyCF_ONLY_AST)
    Unparser(tree, output)

roundtrip("tryexcept.py")
