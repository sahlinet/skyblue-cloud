var myApp = angular.module("MyApp", ["firebase", "ngRoute", "xeditable", "ui.bootstrap", "ngClipboard"]).
config(function($routeProvider, $locationProvider) {
    $routeProvider.
    when("/start",
        {templateUrl: "views/welcome.html"}).
    when("/cloud",
        {templateUrl: "views/cloud.html", controller: "cloudCtrl"}).
    when("/login",
        {templateUrl: "views/login.html", controller: "loginCtrl"}).
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

myApp.run(function(editableOptions) {
  editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
});

myApp.config(['ngClipProvider', function(ngClipProvider) {
    ngClipProvider.setPath("bower_components/zeroclipboard/dist/ZeroClipboard.swf");
}]);

myApp.factory('tutumService', ['$rootScope', '$http', '$q', function($rootScope, $http, $q) {
    $http.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
    if (!angular.isUndefined($rootScope.user)) {
        var url = '/fastapp/base/skyblue-cloud/exec/firebase_get_data_external/?json=&shared_key=30cd22e3-40c0-48c5-b50f-01f8ffd9100c&user_id='+$rootScope.user.uid;
    } else {
        //throw "URL missing";
        console.log("URL missing");
    }
    return {

        'sizes': function() {
            return [
            { value: "XS", text: "XS" },
            { value: "S", text: "S" },
            { value: "M", text: "M" },
            { value: "L", text: "L" },
            { value: "XL", text: "XL" }
            ];
        },
        'update': function(name) {
            var url = '/fastapp/base/skyblue-cloud/exec/firebase_get_data_external/?json=&shared_key=30cd22e3-40c0-48c5-b50f-01f8ffd9100c&user_id='+$rootScope.user.uid;
            url=url+"&name="+name;
            return $http(
            {
                method: 'get',
                url: url
            });
        },
        'updateAll': function(services) {

            var defer = $q.defer();
            var promises = [];
            var keys = services.$getIndex();

            angular.forEach(keys, function(key){

                var service = services[key];
                var name = service.data.name;

                var url = '/fastapp/base/skyblue-cloud/exec/firebase_get_data_external/?json=&shared_key=30cd22e3-40c0-48c5-b50f-01f8ffd9100c&user_id='+$rootScope.user.uid;
                url=url+"&name="+name;

                console.log("syncing");
                console.log(name);

                promises.push($http.get(url));
            });


            $q.all(promises).then(function(update) {
                console.log("tutumService.updateAll() done");
                defer.resolve();
            }, function(update) {
                console.error("tutumService.updateAll() done with error");
                defer.reject();
            });
            return defer.promise;

        },

        'stop': function(service) {
            var url = '/fastapp/base/skyblue-cloud/exec/firebase_get_data_external/?json=&shared_key=30cd22e3-40c0-48c5-b50f-01f8ffd9100c&user_id='+$rootScope.user.uid;
            data = {
                action: "stop",
                service_name: service.data.name
            };
            return $http(
                { method: 'post', url: url, data: jQuery.param(data) });
        },

        'start': function(service) {
            var url = '/fastapp/base/skyblue-cloud/exec/firebase_get_data_external/?json=&shared_key=30cd22e3-40c0-48c5-b50f-01f8ffd9100c&user_id='+$rootScope.user.uid;
            data = {
                action: "start",
                service_name: service.data.name
            };
            return $http(
                { method: 'post', url: url, data: jQuery.param(data) });
        }
    };
}]);

myApp.factory('loginService', ['$rootScope', function($rootScope) {
    var ref = new Firebase("https://tutumui-123.firebaseio.com");
    return {
        'auth': new FirebaseSimpleLogin(ref, function(error, user) {
            if (user) {
                $rootScope.$emit("login", user);
            }
            else if (error) {
                $rootScope.$emit("loginError", error);
            }
            else {
                $rootScope.$emit("logout");
            }
        })
    };
}]);

myApp.controller("loginCtrl", ["$rootScope", "$scope", "$location", "$timeout", "loginService", function($rootScope, $scope, $location, $timeout, loginService) {

    console.log("in loginCtrl");
    console.log(loginService.auth);

    // start login action
    $scope.login = function(provider) {
        loginService.auth.login(provider);
    };

    // when login with success
    $rootScope.$on("login", function(event, user) {
        $rootScope.user = user;
        $scope.user = user;
        console.log('User ID: ' + user.uid + ', Provider: ' + user.provider);
        $location.path("/cloud");
    });

}]);

myApp.controller("navigationCtrl", ["$rootScope", "$scope", "$location", "loginService", function($rootScope, $scope, $location, loginService) {

    $rootScope.location = $location;
    $scope.current = function(text) {
        console.log(text);
        return ($rootScope.location.path().search(text) != -1);
    };

    // initiate sync action
    $scope.sync= function() {
        $rootScope.$emit("sync");
    };

    $scope.running = function() {
        return ($rootScope.sync_running);
    };

    $scope.goToLogin = function() {
        $location.path("/login/");
    };

    // initiate logout action
    $scope.logout = function() {
        console.log("logout");
        console.log(loginService);
        console.log(loginService.auth.logout());
        delete $rootScope.user;
        $location.path("/login");
    };
}]);

myApp.controller("cloudCtrl", ["$scope", "$firebase", "$rootScope", "tutumService", "hookService", function($scope, $firebase, $rootScope, tutumService, hookService, $filter) {
    console.log("Start cloudCtrl");
    $scope.sync_running = false;

    $scope.alerts = [];

    var projectsRef = new Firebase("https://skyblue-cloud-dev.firebaseio.com/users/"+$rootScope.user.uid+"/projects");
    var servicesRef = new Firebase("https://skyblue-cloud-dev.firebaseio.com/users/"+$rootScope.user.uid+"/services");

    $scope.projects = $firebase(projectsRef);
    $scope.services = $firebase(servicesRef);
    console.log($scope.projects);
    console.log($scope.services);

    $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
    };



    $rootScope.$on("sync", function(event) {
        $rootScope.sync_running = true;
        $scope.alerts.push({ type: 'info', msg: 'Sync starting' } );

        var keys = $scope.services.$getIndex();
        //var done = tutumService.updateAll($scope.services);
        var done = tutumService.update();

        done.then(function done(){
            $scope.alerts.push({ type: 'success', msg: 'Sync done' } );
        }, function(reason) {
            $scope.alerts.push({ type: 'warning', msg: 'Sync failed for one or more services ('+reason+')' } );
        }).finally(function() {
            $rootScope.sync_running = false;
        });
    });

    $scope.stop = function(service) {
        if (!angular.isUndefined(service.hook_stop)) {
            url = service.hook_stop;
            $scope.alerts.push({ type: 'info', msg: 'Calling hook '+url });
            data = service.data.details.link_variables;
            hookService.call_hook(url, data).then(function() {
                $scope.alerts.push({ type: 'success', msg: 'Hook ended successfully' });
                $scope.alerts.push({ type: 'info', msg: 'Stopping service '+service.data.name});
                tutumService.stop(service).then(function() {
                    $scope.alerts.push({ type: 'success', msg: 'Service '+service.data.name+' stopped'});
                }, function() {
                    $scope.alerts.push({ type: 'danger', msg: 'Service '+service.data.name+' could not be stopped' });
                });
            }, function() {
                $scope.alerts.push({ type: 'danger', msg: 'Hook returned an error'});
            });
        } else {
            $scope.alerts.push({ type: 'info', msg: 'Stopping service '+service.data.name});
            tutumService.stop(service).then(function() {
                $scope.alerts.push({ type: 'success', msg: 'Service '+service.data.name+' stopped'});
            }, function() {
                $scope.alerts.push({ type: 'danger', msg: 'Service '+service.data.name+' could not be stopped' });
            });
        }
    };

    $scope.start = function(service) {
        $scope.alerts.push({ type: 'info', msg: 'Starting service '+service.data.name});
        tutumService.start(service).then(function() {
            $scope.alerts.push({ type: 'success', msg: 'Service '+service.data.name+' started'});
            if (!angular.isUndefined(service.hook_start)) {
                url = service.hook_start;
                $scope.alerts.push({ type: 'info', msg: 'Calling hook '+url });
                data = service.data.details.link_variables;
                hookService.call_hook(url, data).then(function() {
                    $scope.alerts.push({ type: 'success', msg: 'Hook ended successfully' });
                }, function() {
                    $scope.alerts.push({ type: 'danger', msg: 'Hook returned an error' });
                });
            }
        }, function() {
            $scope.alerts.push({ type: 'danger', msg: 'Service '+service.data.name+' could not be started' });
        });
    };

    $scope.toggle = function(service) {
        if (angular.isUndefined(service.env_vars_show)) {
            service.env_vars_show = false;
        }
        service.env_vars_show = service.env_vars_show === false ? true: false;
        $scope.services.$save(service.data.name);
    };

    $scope.toggleSvc = function(service) {
        if (angular.isUndefined(service.show)) {
            service.show = false;
        }
        service.show = service.show === false ? true: false;
        $scope.services.$save(service.data.name);
    };

    $scope.updateTerminateConfig = function(service) {
        service.terminate = parseInt(service.terminate);
        $scope.services.$save(service.data.name);
    };

    $scope.getConnectCommand = function(service) {
        return "asdf";
    };

    $scope.doSomething = function () {
        console.log("NgClip...");
    };

}]);

myApp.controller('SizeCtrl',  ["$scope", "$filter", "tutumService", function($scope, $filter, tutumService) {

    // Radio
    $scope.sizes = tutumService.sizes();

    $scope.showSizes = function(service) {

        var size = $filter('filter')($scope.sizes, {value: service.data.size}, true);
        if (service.data.name == "cache") {
            console.log(size);
            console.log(size);
            console.log(service.data.size);
            console.info((service.data.size && size.length) ? size[0].text : 'XS');
            console.info((service.data.size && size.length));
            console.info(service.data.size);
            console.info(size.length);
            console.info(size[0].text);
        }
        return (service.data.size && size.length) ? size[0].text : 'XS';
    };

    $scope.updateSizeConfig = function(service) {
        $scope.services.$save(service.data.name);
    };

}]);

myApp.controller('ConfigurationCtrl',  function($scope, $filter) {

    // Radio
    $scope.terminate_config = [
    { value: 1, text: "Destroy on stop" },
    { value: 2, text: "Keep on stop"}
    ];


    $scope.showTerminateConfig = function(service) {

        // initial default
        if (angular.isUndefined(service.terminate)) {
            service.terminate = 1;
            $scope.updateTerminateConfig(service);
        }
        var terminate = $filter('filter')($scope.terminate_config, {value: service.terminate});
        return (service.terminate && terminate.length) ? terminate[0].text : 'Not set';
    };

    $scope.updateTerminateConfig = function(service) {
        service.terminate = parseInt(service.terminate);
        $scope.services.$save(service.data.name);
    };

    $scope.full_role = {"full": true}

    /*$scope.showRoleConfig = function(service) {
        // initial default
        console.log(service.data.name);
        //console.log(service.roles);
        if (angular.isUndefined(service.roles)) {
            service.roles= "";
            $scope.updateRoleConfig(service);
        }

        var selected = [];
        angular.foreach($scope.role_config, function(s) { 
          if (service.roles.indexof(s.value) >= 0) {
            selected.push(s.text);
          }
        });

        return selected.length ? selected.join(', ') : 'Not set';
    };

    $scope.updateRoleConfig= function(service) {
        console.log(service.roles);
        $scope.services.$save(service.data.name).then(function(){console.log("OK")}).catch(function(){console.log("NOK")});
    };
    */

});

myApp.factory('hookService', ['$rootScope', '$http', '$q', '$timeout', function($rootScope, $http, $q, $timeout) {
    $http.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
    return {
        'call_hook': function(url, data) {

            /*if (mode == "start") {
                service._hook_start_running=true;
                url = service.hooks.start;
            } else {
                service._hook_stop_running=true;
                url = service.hooks.stop;
            }*/

            call = function(url, data) {
                //$scope.alerts.push({ type: 'success', msg: 'Hook on start initiated' } );
                deferred = $q.defer();
                run = function(url, data) {

                    $http({
                        method: 'POST',
                        url: url,
                        data: $.param(data)
                    }).success(function(data, status, headers, config) {
                        if (data.status != "RUNNING") {
                            deferred.resolve(data, status, headers, config);
                        } else {
                            url = data.url;
                            $timeout(function() {
                                run(url, data);
                            }, 3000);
                        }
                    }).error(function(data, status, headers, config) {
                        console.error(status);
                    }).then(function(result) {
                        console.log("one retry/loop");
                    });
                };

                run(url, data);
                return deferred.promise;
            };

            //service = service;
            //mode = service.mode;

            //set_state(true);
            return call(url, data).then(function(data) {
                console.log("finished");
                console.log(data);
                //set_state(false);
                //$scope.alerts.push({ type: 'success', msg: 'Hook on start finished with '+data.status } );
            });
        }
    };
}]);

myApp.controller("HookCtrl", ["$scope", "hookService", "$rootScope", "$timeout", function($scope, hookService, $rootScope, $timeout) {
    $scope.call_hook = function(service, mode) {
        if (mode == "start") {
            //$scope.$apply(service._hook_start_running=true);
            url = service.hook_start;
        } else {
            //service._hook_stop_running=true;
            url = service.hook_stop;
        }
        data = service.data.details.link_variables;
        console.log(data);
        hookService.call_hook(url, data);
        /*if (mode == "start") {
            $scope.$apply(service._hook_start_running=false;
        } else {
            service._hook_stop_running=false;
        }*/
    };
}]);