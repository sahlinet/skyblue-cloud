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

myApp.run(function(editableOptions) {
  editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
});

myApp.config(['ngClipProvider', function(ngClipProvider) {
    ngClipProvider.setPath("bower_components/zeroclipboard/dist/ZeroClipboard.swf");
}]);

myApp.factory('tutumService', ['$rootScope', '$http', '$q', 'hookService', function($rootScope, $http, $q, hookService) {
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
        'update': function() {
            var url = '/fastapp/base/skyblue-cloud/exec/firebase_get_data_external/?json=&async&shared_key=30cd22e3-40c0-48c5-b50f-01f8ffd9100c&user_id='+$rootScope.user.uid;
            //url=url+"&name="+name;
            return hookService.call_hook(url, {});
        },

        'stop': function(service) {
            var url = '/fastapp/base/skyblue-cloud/exec/firebase_get_data_external/?json=&async&shared_key=30cd22e3-40c0-48c5-b50f-01f8ffd9100c&user_id='+$rootScope.user.uid;
            data = {
                action: "stop",
                service_name: service.data.name
            };
            return hookService.call_hook(url, data);
            /*return $http(
                { method: 'post', url: url, data: jQuery.param(data) });*/
        },

        'start': function(service) {
            var url = '/fastapp/base/skyblue-cloud/exec/firebase_get_data_external/?json=&async&shared_key=30cd22e3-40c0-48c5-b50f-01f8ffd9100c&user_id='+$rootScope.user.uid;
            data = {
                action: "start",
                service_name: service.data.name
            };
            return hookService.call_hook(url, data);
            /*return $http(
                { method: 'post', url: url, data: jQuery.param(data) });*/
        }
    };
}]);

myApp.factory('loginService', ['$rootScope', function($rootScope) {
    var ref = new Firebase(window.firebase_url);
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
        $rootScope.$apply(function() {$location.path("/cloud");});
    });

}]);

myApp.controller("navigationCtrl", ["$rootScope", "$scope", "$location", "loginService", function($rootScope, $scope, $location, loginService) {

    $rootScope.location = $location;
    $scope.current = function(text) {
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

    $scope.go = function ( path ) {
        $location.path( path );
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

myApp.controller("profileCtrl", ["$scope", "$firebase", "$rootScope", function($scope, $firebase, $rootScope) {

    console.log("profileCtrl");

    var profileRef = new Firebase(window.firebase_url+"/users/"+$rootScope.user.uid+"/config");

    $scope.config = $firebase(profileRef);
    console.log($scope.config);

    $scope.save = function() {
        console.log("save");
        console.log($scope.config);
        $scope.config.$save();
    };

}]);
myApp.controller("cloudCtrl", ["$scope", "$firebase", "$rootScope", "tutumService", "hookService", function($scope, $firebase, $rootScope, tutumService, hookService, $filter) {
    console.log("Start cloudCtrl");
    $scope.sync_running = false;

    $scope.alerts = [];

    var projectsRef = new Firebase(window.firebase_url+"/users/"+$rootScope.user.uid+"/projects");
    var servicesRef = new Firebase(window.firebase_url+"/users/"+$rootScope.user.uid+"/services");

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
        console.log($rootScope.call_hook);
        service._stopping = true;
        if (!angular.isUndefined(service.hook_stop)) {
            url = service.hook_stop;
            $scope.alerts.push({ type: 'info', msg: 'Call Hook '+url });
            data = service.data.details.link_variables;
            hookService.call_hook(url, data).then(function() {
                $scope.alerts.push({ type: 'success', msg: 'Hook ended successfully' });
                $scope.alerts.push({ type: 'info', msg: 'Stopping service '+service.data.name});
                tutumService.stop(service).then(function() {
                    $scope.alerts.push({ type: 'success', msg: 'Service '+service.data.name+' stopped'});
                }, function() {
                    $scope.alerts.push({ type: 'danger', msg: 'Service '+service.data.name+' could not be stopped' });
                    service._stopping = false;
                });
            }, function() {
                service._stopping = false;
                $scope.alerts.push({ type: 'danger', msg: 'Hook returned an error'});
            });
        } else {
            $scope.alerts.push({ type: 'info', msg: 'Stopping service '+service.data.name});
            tutumService.stop(service).then(function() {
                $scope.alerts.push({ type: 'success', msg: 'Service '+service.data.name+' stopped'});
            }, function() {
                service._stopping = false;
                $scope.alerts.push({ type: 'danger', msg: 'Service '+service.data.name+' could not be stopped' });
            });
        }
        service._stopping = false;
    };

    $scope.start = function(service) {
        $scope.alerts.push({ type: 'info', msg: 'Starting service '+service.data.name});
        service._starting = true;
        tutumService.start(service).then(function() {
            $scope.alerts.push({ type: 'success', msg: 'Service '+service.data.name+' started'});
            if (!angular.isUndefined(service.hook_start)) {
                url = service.hook_start;
                $scope.alerts.push({ type: 'info', msg: 'Calling hook '+url });
                data = service.data.details.link_variables;
                data['name'] = service.data.name;

                hookService.call_hook(url, data).then(function() {
                    $scope.alerts.push({ type: 'success', msg: 'Hook ended successfully' });
                }, function() {
                    $scope.alerts.push({ type: 'danger', msg: 'Hook returned an error' });
                });
            }
        }, function() {
            $scope.alerts.push({ type: 'danger', msg: 'Service '+service.data.name+' could not be started' });
        });
        service._starting = false;
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

    $scope.starting = function(service) {
        return (!typeof service._starting === "undefined" || service._starting);
    };
    $scope.stopping = function(service) {
        return (!typeof service._stopping === "undefined" || service._stopping);
    };

    $scope.newVar = function(service) {
        service.data.custom_env_vars.push({'key': "new", 'value': "new"});
        $scope.services.$save(service.data.name);
    };
    $scope.delVar = function(service, variable, index) {
        console.log(service);
        console.log(variable);
        console.log(index);
        service.data.custom_env_vars.splice(index, 1);
        $scope.services.$save(service.data.name);
    };

}]);

myApp.controller('SizeCtrl',  ["$scope", "$filter", "tutumService", function($scope, $filter, tutumService) {

    // Radio
    $scope.sizes = tutumService.sizes();

    $scope.showSizes = function(service) {

        var size = $filter('filter')($scope.sizes, {value: service.data.size}, true);
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

});

myApp.factory('hookService', ['$rootScope', '$http', '$q', '$timeout', '$location', function($rootScope, $http, $q, $timeout, $location) {
    $http.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
    return {
        'call_hook': function(url, request_data) {

            console.log(request_data);
            call = function(url, request_data) {
                //$scope.alerts.push({ type: 'success', msg: 'Hook on start initiated' } );
                deferred = $q.defer();

                console.log(request_data);

                /*if ($location.host() == "localhost") {
                    url = "http://localhost:8000/fastapp/base/skyblue-cloud/exec/proxy_for_hooks/?json&async";
                }*/
                run = function(url, request_data) {
                    //console.log(request_data);

                    /*if (angular.isUndefined(data)) {
                        data = data;
                    } else {
                        data = $.param(data);

                    }*/

                    $http.post(url, $.param(request_data)).success(function(data, status, headers, config) {
                        if (data.status != "RUNNING") {
                            deferred.resolve(status);
                        } else {
                            url = data.url;
                            $timeout(function() {
                                run(url, request_data);
                            }, 3000);
                        }
                    }).error(function(data, status, headers, config) {
                        console.error(status);
                        deferred.reject(status);
                    }).then(function(result) {
                        console.log("one retry/loop");
                    });
                };

                run(url, request_data);
                return deferred.promise;
            };

            return call(url, request_data);
        }
    };
}]);

myApp.controller("HookCtrl", ["$scope", "hookService", "$rootScope", "$timeout", "$location", function($scope, hookService, $rootScope, $timeout, $location) {
    $scope.stop_hook_running = function(service) {
        return (!typeof service._hook_stop_running === "undefined" || service._hook_stop_running);
    };
    $scope.start_hook_running = function(service) {
        return (!typeof service._hook_start_running === "undefined" || service._hook_start_running);
    };
    $scope._hook_stop = function(service, mode, result) {
        if (mode == "start") {
                service._hook_start_running=false;
                service._hook_start_result=result;
            } else {
                service._hook_stop_running=false;
                service._hook_stop_result=result;
        }
    };

    $scope.call_hook = function(service, mode) {
        if (mode == "start") {
            if (typeof service.hook_start === "undefined") { return; }
            service._hook_start_running=true;
            url = service.hook_start;
        } else {
            if (typeof service.hook_stop === "undefined") { return; }
            service._hook_stop_running=true;
            url = service.hook_stop;
        }
        data = service.data.details.link_variables;
        angular.forEach(service.data.custom_env_vars, function(value, key) {
            data[value['key']] = value['value'];
        });

        data['HOOK_URL'] = url;
        data['id'] = service.data.id;
        data['NAME'] = service.data.name;

        request_data = data;

        hookService.call_hook(url, request_data).then(function(result, status) {
            $scope._hook_stop(service, mode);
            $scope.alerts.push({ type: 'success', msg: 'Hook '+url+' call successfully: '+result+'' } );
            console.log(result);
        }, function(result) {
            $scope.alerts.push({ type: 'warning', msg: 'Hook '+url+' call failed: '+result+'' } );
            $scope._hook_stop(service, mode);
            console.log(result);
        });
    };
}]);