var module = angular.module('myApp', ['ngSanitize']);
var pg = require('pg');

module.factory('ThemeSvc', function() {
    return [ // themes/themes.php
                {id:'default', name: 'Default'},
                {id:'cappuccino', name: 'Cappuccino'},
                {id:'gotar', name: 'Blue/Green'}
    ];
});

module.controller('ThemeCtrl', ['$scope', 'ThemeSvc', '$rootScope', function($scope, themeSvc, $rootScope) {
    $scope.themes = themeSvc;
    $scope.theme  = ($rootScope.theme ? $rootScope.theme : themeSvc[0]);
    $scope.themeChange = function() {
      $rootScope.theme = $scope.theme;
    };
    $scope.themeChange();
}]);

function assertNotUndefined(p) {
	if (p === undefined) throw new Error("assertion failed: undefined");
}
function assert(p) {
	if (p !== true) throw new Error("assertion failed");
}

function brl_to_entry(languages,l,nocut) {
  if (!nocut)
    var iso639 = l.split('-')[0];
  else
    var iso639 = l;
  var found = languages.availableLanguages.filter(function(i) { return i.iso639 === iso639; }); if (found.length === 0 && !nocut) return brl_to_entry(languages,l,true);
  var found2 = languages.appLangFiles.filter(function(i) { return i.id === found[0].id; });
  return found2[0];
}

module.factory('LanguageSvc', function() {
    return {'data': null, 'oldCurrentLanguage': null};
});

function gen(data, currentLanguage) {
      var t = {};
      Object.keys(data.texts["english"]).map(function(s) { 
        var val = data.texts[currentLanguage.id][s];
        if (val === undefined) val = data.texts["english"][s];
        t[s] = val;
      });
      return t;
}

module.controller("NavBarCtrl", ['$scope','$location', function($scope, $location) {
      // Uses the url to determine if the selected
      // menu item should have the class active.
      $scope.$location = $location;
      $scope.$watch('$location.path()', function (path) {
          $scope.activeNavId = path || '/';
        }
      );

      // getClass compares the current url with the id.
      // If the current url starts with the id it returns 'active'
      // otherwise it will return '' an empty string. E.g.
      //
      //   # current url = '/products/1'
      //  getClass('/products') # returns 'active'
      //  getClass('/orders') # returns ''
      $scope.getClass = function (id) {
        if($scope.activeNavId.substring(0, id.length) == id)
          return 'active';
        else
          return '';
      };
}]);

module.controller('LanguageCtrl', ['$scope', '$locale', '$http', '$rootScope', 'LanguageSvc', function($scope, $locale, $http, $rootScope, langSvc) {
    $scope.$on("langDataReady", function(event) {
        var data = langSvc.data;
        $scope.langFiles = data.appLangFiles;
        $scope.currentLanguage = langSvc.oldCurrentLanguage;
        $scope.languageChange = function() {
          $rootScope.t = gen(data,$scope.currentLanguage);
        };
        $scope.languageChange();
    });
    if (langSvc.data && langSvc.oldCurrentLanguage) {
      $scope.$broadcast("langDataReady");
    }
}]);

module.controller("TreeController", ['$scope', function($scope) {
    $scope.delete = function(data) {
        data.nodes = [];
    };
    $scope.add = function(data) {
        var post = data.nodes.length + 1;
        var newName = data.name + '-' + post;
        data.nodes.push({name: newName,nodes: []});
    };
    $scope.tree = [{name: "Node", nodes: []}];
}]);

module.factory('ConnectionSvc', function() {
    this.connections = [];
    this.servers = [{desc: 'PostgreSQL', host: 'localhost', port: 5433, sslmode: 'allow', defaultdb: 'template1'}];
    return this;
});

module.controller("ServersCtrl", ['$scope', 'ConnectionSvc', '$rootScope', function($scope, connectionSvc, $rootScope) {
	$scope.servers = connectionSvc.servers;
	$scope.getConnFromIdx = function(idx) { var f = connectionSvc.connections.filter(function(conn){ return conn.server === idx}); if (f.length===0) return null; else return f[0]; };
	$scope.getUsername = function(idx) { var conn=$scope.getConnFromIdx(idx); if (conn !== null) return conn.username; else return ""; };
	var idx=-1;
        $scope.message2 = "";
	$scope.makeActions = function() {
	$scope.actions = $scope.servers.map(function(serv) {var con = $scope.getConnFromIdx(++idx); if (con) return [{do: function(){connectionSvc.connections.splice(idx,1); $scope.makeActions(); $scope.message2 = sprintf($rootScope.t.strlogoutmsg,serv.desc); }, desc:"Logout"}]; else return []; });
	};
	$scope.makeActions();
}]);

function isLoggedIn($routeParams, connectionSvc, $location) {
	if (!connectionSvc.connections[$routeParams.serverNum]) {
		$location.path("/root/servers/" + $routeParams.serverNum + "/login");
		return false;
	}
	return true;
}

module.controller("ServerCtrl", ['$scope', 'ConnectionSvc', '$routeParams', '$location', function($scope, connectionSvc, $routeParams, $location) {
	connectionSvc.servers;
	$scope.serverNum = $routeParams.serverNum;
	if (!isLoggedIn($routeParams, connectionSvc, $location)) return;
	$location.path("/root/servers/" + $scope.serverNum + "/databases");
}]);


  var after = function($scope,callback) {
    if (!$scope || !callback) throw new Error("missing argument!");
    return function(err, queryResult) {
      if(err) {
        $scope.message += "\n" + err.toString();
	console.error(err);
	$scope.$apply();
      } else {
        callback(queryResult);
      }
    };
  };

function getHumanSize(size) {
  var SizePrefixes = ['','K','M','G','T','P','E','Z','Y'];
  if(size <= 0) return '0';
  var t2 = Math.min(Math.floor(Math.log(size)/Math.log(1024)),
                    SizePrefixes.length-1);
  return String((Math.round(size * 100 / Math.pow(1024, t2)) / 100)) + 
         ' ' + SizePrefixes[t2] + 'iB';
}

module.controller("DBCreateCtrl", ['$scope', 'ConnectionSvc', '$routeParams', '$location', function($scope, connectionSvc, $routeParams, $location) {
	if (!isLoggedIn($routeParams, connectionSvc, $location)) return;
	$scope.serverNum = $routeParams.serverNum;
	var con = connectionSvc.connections[$routeParams.serverNum];
	$scope.message = "";
	$scope.databases = [];
	$scope.tablespaces = [];
	$scope.templateDB = null;
	$scope.newDBName = "";
	$scope.selectedTablespace = null;
	var i = 0, template1idx;
	pg.connect(con.conString, after($scope,function(client) {
		client.query("SELECT pdb.datname AS datname FROM pg_catalog.pg_database pdb WHERE pdb.datallowconn ORDER BY pdb.datname",after($scope,function(client){
			client.rows.map(function(row){
				$scope.databases.push({	
					name: row.datname
				});
				if (row.datname === "template1") template1idx = i++; else i++;
			});
			$scope.databases.push({name: "template0"});
			$scope.templateDB = $scope.databases[template1idx];
			$scope.$apply();
		}));
		client.query("SELECT spcname, pg_catalog.pg_get_userbyid(spcowner) AS spcowner, spclocation,\n" +
                             "(SELECT description FROM pg_catalog.pg_shdescription pd WHERE pg_tablespace.oid=pd.objoid) AS spccomment\n" +
                             "                   FROM pg_catalog.pg_tablespace ORDER BY spcname", after($scope, function(client) {
			$scope.tablespaces.push({name: ''});
			client.rows.map(function(row){
				$scope.tablespaces.push({
					name: row.spcname
				});
			});
			$scope.selectedTablespace = $scope.tablespaces[0];
			$scope.$apply();
		}));
	}));
	$scope.submit = function() {
		pg.connect(con.conString, after($scope,function(client) {
			client.query({text:'CREATE DATABASE "' + $scope.newDBName + '" WITH TEMPLATE = "' + $scope.templateDB.name + '"'},after($scope,function(){
				$location.path("/root/servers/" + $scope.serverNum + "/databases");
				$scope.$apply();
			}));
		}));
	};

}]);

function dropDBs($scope, con, databasenames, cb) {
	pg.connect(con.conString, after($scope,function(client) {
		databasenames.map(function(name) {client.query('DROP DATABASE "' + name + '"',after($scope, function() {$scope.message += name + ": " + "Database dropped\n"; $scope.$apply(); cb(); }))});
	}));
}

module.controller("DatabasesCtrl", ['$scope', 'ConnectionSvc', '$routeParams', '$location', function($scope, connectionSvc, $routeParams, $location) {
	if (!isLoggedIn($routeParams, connectionSvc, $location)) return;
	$scope.serverNum = $routeParams.serverNum;

	$scope.$watch("$scope.isgreyed", $scope.updateMaster = function() {
		$("#db_check_all_none").prop("indeterminate", $scope.isgreyed);
	});
	$scope.isgreyed = false;
	$scope.master = false;
	$scope.onmasterclick = function() {
		$scope.databases.map(function(v) {
			v.isSelected = $scope.master;
		})
	}

	$scope.onitemclick = ($scope.recountChecked = function() {
		if ($('.db_check_item:checked').length === 0) {
			$scope.isgreyed = false;
			$scope.master = false;
		} else if ($('.db_check_item:not(:checked)').length === 0) {
			$scope.isgreyed = false;
			$scope.master = true;
		} else {
			$scope.isgreyed = true;
		}
		$scope.updateMaster();
	});

	var con = connectionSvc.connections[$routeParams.serverNum];
	$scope.message = "";
	$scope.databases = [];
	// {owner: ..., encoding: ..., collation: ..., character-type: ..., tablespace: ..., size: ..., actions: ..., comment: ...}
	pg.connect(con.conString, after($scope,function(client) {
		client.query(
[
"SELECT pdb.datname AS datname, pr.rolname AS datowner, pg_encoding_to_char(encoding) AS datencoding,",
"					(SELECT description FROM pg_catalog.pg_shdescription pd WHERE pdb.oid=pd.objoid) AS datcomment,",
"					(SELECT spcname FROM pg_catalog.pg_tablespace pt WHERE pt.oid=pdb.dattablespace) AS tablespace,",
"					CASE WHEN pg_catalog.has_database_privilege(current_user, pdb.oid, 'CONNECT') ",
"						THEN pg_catalog.pg_database_size(pdb.oid) ",
"						ELSE -1 -- set this magic value, which we will convert to no access later  ",
"					END as dbsize, pdb.datcollate, pdb.datctype",
"				FROM pg_catalog.pg_database pdb",
"					LEFT JOIN pg_catalog.pg_roles pr ON (pdb.datdba = pr.oid)",
"				WHERE true",
"					 AND pdb.datallowconn",
"					",
"				ORDER BY pdb.datname",
].join("\n"),after($scope,function(result){
			result.rows.map(function(row){
				var obj;
				$scope.databases.push(obj = {isSelected: false, name: row.datname, owner: row.datowner, encoding: row.datencoding, collation: row.datcollate, charactertype: row.datctype, tablespace: row.tablespace, size: getHumanSize(Number(row.dbsize)), actions: [
					{desc: "Drop", fun: function() { dropDBs($scope, con, [row.datname], function() {
						$scope.databases = $scope.databases.filter(function(v) { return v !== obj; });
						$scope.$apply();
						$scope.recountChecked();
					}); } },
					{desc: "Privileges", fun: function() {} },
					{desc: "Alter", fun: function() {} },
				], comment: row.datcomment});
			});
			$scope.actionsForSelected = [
				{desc: "--", fun: function() {} }, 
				{desc: "Drop", fun: function() { dropDBs($scope, con, $scope.databases.filter(function(v) {return v.isSelected}).map(function(v){return v.name}), function() {
					$scope.databases = $scope.databases.filter(function(v) { return !v.isSelected; });
					$scope.$apply();
					$scope.recountChecked();
				}); } }
			];
			$scope.selectedAction = $scope.actionsForSelected[0];
			$scope.$watch("selectedAction", function() {
				$scope.selectedAction.fun();
				$scope.selectedAction = $scope.actionsForSelected[0];
			});
			$scope.$apply();
		}));
	}));
}]);

module.controller("SqlCtrl", ['$scope', 'ConnectionSvc', '$routeParams', '$location', function($scope, connectionSvc, $routeParams, $location) {
	if (!isLoggedIn($routeParams, connectionSvc, $location)) return;
	var con = connectionSvc.connections[$routeParams.serverNum];
        $scope.message = "";
	$scope.sqltext = 	"SELECT table_schema,table_name\n" +
				"FROM information_schema.tables\n" + 
				"ORDER BY table_schema,table_name;";
	$scope.executesql = function() {
	pg.connect(con.conString, after($scope,function(client) {
		client.query($scope.sqltext, after($scope,function(client){
			$scope.columns = [];
			if (client.rows.length > 0) {
				for (var i in client.rows[0]) {
					if (client.rows[0].hasOwnProperty(i)) {
						$scope.columns.push(i);
					}
				}
			}
			$scope.rows = client.rows;
			$scope.rows = $scope.rows.map(function(row) {
				return Object.keys(row).map(function(key) {
					var field = row[key];
					if (field === null)	return {isNull: true, data: "null" }
					else			return {isNull: false, data: field }
				});
			});
			$scope.$apply();
		}));
	}));
	};

}]);
module.controller("LoginCtrl", ['$scope', 'ConnectionSvc', '$routeParams', '$location', function($scope, connectionSvc, $routeParams, $location) {
	//$scope.$routeParams = $routeParams;
	$scope.sprintf = window.sprintf;
	$scope.serverNum = $routeParams.serverNum;
	var server = $scope.server = connectionSvc.servers[$scope.serverNum];
	$scope.username = "";
	$scope.password = "";
	$scope.message = "";
	$scope.submit = function() {
		var conString = {"host": server.host, "port": server.port, "password": $scope.password, "user": $scope.username, "database": server.defaultdb};
  
  pg.connect(conString, after($scope,function(client) {
    connectionSvc.connections.push({"server": Number($scope.serverNum), "conString": conString, "username": $scope.username});

    $location.path("/root/servers/" + $scope.serverNum + "/databases");
    $scope.$apply();
  }));
	}
}]);

module.controller("TopBarCtrl", ['$rootScope', '$scope', 'ConnectionSvc', '$routeParams', '$location', function($rootScope, $scope, connectionSvc, $routeParams, $location) {

	$scope.$location = $location;
	$scope.fun = function() {
	if ($location.path().startsWith("/root/servers/") && $location.path() !== "/root/servers/" && !$location.path().endsWith("login")) {

		var conns = connectionSvc.connections.filter(function(v) {return v.server === Number($location.path().split("/")[3]); });
		if (conns.length === 0) {
			$scope.content = "unknown state";
		} else {
			pg.connect(conns[0].conString,after($scope,function(client){client.query("SELECT VERSION() as version",after($scope,function(result) {
				$scope.content = "<span class='platform'>" + "PostgreSQL " + sprintf($rootScope.t.strtopbar,result.rows[0].version.split(" ")[1] + "</span>", "<span class='host'>" + connectionSvc.servers[conns[0].server].host + "</span>", "<span class='port'>" + connectionSvc.servers[conns[0].server].port + "</span>", "<span class='username'>" + conns[0].username + "</span>");
				$scope.$apply();
			}));}));
		}
	} else {
		$scope.content = "jsPgAdmin";
	}
	$scope.links = [{url: "/root/servers/"+$routeParams.serverNum+"/sql", desc: 'SQL'}];
	// format : {url: ..., desc: ...}
	}
	$scope.$watch("$location.path()", $scope.fun);
	$scope.fun();

}]);

module.config([
  '$routeProvider', '$locationProvider' , function ($routeProvider, $locationProvider) {
     $routeProvider
       .when('/', {redirectTo : '/root/intro'})
       .when('/root/intro', {template : '<ng-include src="\'/root/intro\'"></ng-view>'})
       .when('/root/servers', {template : '<ng-include src="\'/root/servers\'"></ng-view>'})
       .when('/root/servers/:serverNum', {template : '<ng-include src="\'/root/servers/n\'"></ng-view>', controller: 'ServerCtrl'})
       .when('/root/servers/:serverNum/login', {template : '<ng-include src="\'/root/servers/n/login\'"></ng-view>'})
       .when('/root/servers/:serverNum/databases', {template : '<ng-include src="\'/root/servers/n/databases\'"></ng-view>'})
       .when('/root/servers/:serverNum/databases/create', {template : '<ng-include src="\'/root/servers/n/databases/create\'"></ng-view>'})
       .when('/root/servers/:serverNum/sql', {template : '<ng-include src="\'/root/servers/n/sql\'"></ng-view>'})

       .when('/404', {template: '<h1>404: {{problem}}<br><a target="_self" href="/jsppa{{fix.url}}">{{fix.desc}}</a></h1>', controller: function($scope,$location) {$scope.problem = $location.search().requested + " not found"; $scope.fix={"url":$location.search().requested,"desc": "try again"}}})
       .otherwise({redirectTo: function(routeParam, path, search){ return '/404?requested=' + path; }});
     ;

     $locationProvider.html5Mode(true);
  }
]);

module.run(function($locale, $http, $rootScope, ThemeSvc, LanguageSvc) {
  $http.get('http://tyskland.goxadidi.dk:8800/jsppa/languages.php').success(function(data){
    $rootScope.langData = data;
    $rootScope.outerCurrentLanguage = brl_to_entry(data,$locale.id);
    $rootScope.t = gen(data,$rootScope.outerCurrentLanguage);

    LanguageSvc.data = data;
    LanguageSvc.oldCurrentLanguage = $rootScope.outerCurrentLanguage;
    $rootScope.$broadcast("langDataReady");
  });
  $rootScope.theme = ThemeSvc[0];
});
