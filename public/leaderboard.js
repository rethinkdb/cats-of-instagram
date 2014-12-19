var app = angular.module("Leaderboard", []);

app.controller("MainController", [
  "$rootScope", "$scope", "$http",
  function($rootScope, $scope, $http) {

    $scope.cats = [];

    var socket = io.connect();

    socket.on("leaderboard", function(data) {
      console.log("Data:", data);

      if (!data.new_val) {
        Array.prototype.push.apply($scope.cats, data.reverse());
        console.log("backlog");
      }
      else {

        var update = false;
        for (var i in $scope.cats) {
          if ($scope.cats[i].id == data.new_val.id) {
            $scope.cats[i] = data.new_val;
            update = true;
          }
        }
        
        if (!update) $scope.cats.push(data.new_val);
      }

      console.log($scope.cats);
      $scope.$apply();
    });
}]);
