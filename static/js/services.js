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


myApp.factory('hookService', ['$rootScope', '$http', '$q', '$timeout', '$location', function($rootScope, $http, $q, $timeout, $location) {
    $http.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
    return {
        'call_hook': function(url, request_data) {

            console.log(request_data);
            call = function(url, request_data) {
                //$scope.alerts.push({ type: 'success', msg: 'Hook on start initiated' } );
                deferred = $q.defer();

                // Check if sync
                console.log(url);
                console.log(url.indexOf("firebase_get_data_external"));
                if (url.indexOf("firebase_get_data_external") == -1 ) {
                    // call hooks via proxy on the same host
                    if ($location.host() == "localhost") {
                        url = "http://localhost:8000/fastapp/base/skyblue-cloud/exec/proxy_for_hooks/?json&async";
                    }
                }
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