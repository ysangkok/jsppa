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

module.controller("ServerCtrl", ['$scope', 'ConnectionSvc', '$routeParams', '$location', function($scope, connectionSvc, $routeParams, $location) {
	connectionSvc.servers;
	$scope.serverNum = $routeParams.serverNum;
	if (!connectionSvc.connections[$scope.serverNum]) {
		$location.path("/root/servers/" + $scope.serverNum + "/login");
	} else {
		$location.path("/root/servers/" + $scope.serverNum + "/databases");
	}
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
  var after = function(callback) {
    return function(err, queryResult) {
      if(err) {
        $scope.message = err.toString();
	console.log(err);
	$scope.$apply();
      } else {
        callback(queryResult);
      }
    };
  };
  
  pg.connect(conString, after(function(client) {
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
			pg.connect(conns[0].conString,function(err,client){client.query("SELECT VERSION() as version",function(err, result) {
				if (err) { console.error(err); return; }
				$scope.content = "<span class='platform'>" + "PostgreSQL " + sprintf($rootScope.t.strtopbar,result.rows[0].version.split(" ")[1] + "</span>", "<span class='host'>" + connectionSvc.servers[conns[0].server].host + "</span>", "<span class='port'>" + connectionSvc.servers[conns[0].server].port + "</span>", "<span class='username'>" + conns[0].username + "</span>");
				$scope.$apply();
			});});
		}
	} else {
		$scope.content = "jsPgAdmin";
	}
	$scope.links = [];
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
