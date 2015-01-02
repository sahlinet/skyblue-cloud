var myApp = angular.module("MyApp", ["firebase", "ngRoute", "xeditable", "ui.bootstrap", "ui.bootstrap.tpls", "ngClipboard"]).
config(function($routeProvider, $locationProvider) {
    $routeProvider.
    when("/start",
        {templateUrl: "views/welcome.html"}).
    when("/cloud",
        {templateUrl: "views/cloud.html", controller: "cloudCtrl"}).
    when("/login",
        {templateUrl: "views/login.html", controller: "loginCtrl"}).
    when("/profile",
        {templateUrl: "views/profile.html", controller: "profileCtrl"}).
    otherwise({redirectTo: "/start"});
}).
run(function($rootScope, $location) {
    $rootScope.$on("$routeChangeStart", function(event, next, current) {
        console.log("onRouteChangeStart to "+next.templateUrl);
        $rootScope.showMainContent = function() {
            if (next.templateUrl==="views/welcome.html") {
                return true;
            } else {
                return false;
            }
        };
        if ($rootScope.user == null) {
            if (next.templateUrl === "views/login.html") {
            }
            else {
                $location.path("/start");
                
            }
        }
    }
    );
});
