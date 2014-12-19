var app = angular.module("TinderCats",
    ["ionic", "ionic.contrib.ui.tinderCards"]);

app.config(function($stateProvider, $urlRouterProvider) {

});

app.directive("noScroll", function($document) {
  return {
    restrict: "A",
    link: function($scope, $element, $attr) {
      $document.on("touchmove", function(e) {
        e.preventDefault();
      });
    }
  }
});

app.controller("AppController", [
  "$rootScope", "$scope", "$http", "TDCardDelegate",
  function($rootScope, $scope, $http, TDCardDelegate) {
    $scope.cats = [];
    
    $scope.cardDestroyed = function(index) {
      $scope.cats.splice(index, 1);
    };

    $scope.swipedLeft = function(index) {
      console.log("Nope:", index);
    };

    $scope.swipedRight = function(index) {
      console.log("Yep:", index);
      var url = "/cats/" + $scope.cats[index].id + "/vote";
      $http.get(url).success(function(response) {
        console.log(response);
      })
    };

    $http.get("/cats").success(function(items) {
      if (items.length) {
        items.reverse();
        Array.prototype.push.apply($scope.cats, items);
      }
      console.log($scope.cats);
    })
    .error(function(err) { console.log("Failed:", err); });
}]);

/*
app.controller("ItemController", [
  "$rootScope", "$scope", "$state", "$stateParams", 
  function($rootScope, $scope, $state, $stateParams) {
    var item = parseInt($stateParams.item);
    var kind = $state.$current.name.split("-")[0];
    $scope.item = $rootScope[kind].items[item];
}]);

app.controller("ListController", function($scope, $http) {
  $scope.items = [];
  var end = false;

  $scope.fetchMore = function() {
    if (end) return;

    var count = $scope.items.length;
    var params = count ? {"last":
      $scope.data.items[count-1].name} : {}

    $http.get("/beers", {params: params}).success(function(items) {
      if (items.length)
        Array.prototype.push.apply($scope.items, items);
      else end = true;
    }).error(function(err) {
      console.log("Failed to download list items:", err);
      end = true;
    }).finally(function() {
      $scope.$broadcast("scroll.infiniteScrollComplete");
    });
  };
});

app.controller("ListController", [
  "$rootScope", "$scope", "$state", "$http",
  function($rootScope, $scope, $state, $http) {

    if (!$rootScope.coordinates) {
      navigator.geolocation.getCurrentPosition(function(pos) {
        $rootScope.coords = pos.coords;
        console.log(pos.coords);
        if (kind == "nearby")
          $scope.fetchMore();
      });
    }

    var kind = $state.$current.name;
    if (!(kind in $rootScope))
      $rootScope[kind] = {items: [], end: false};
    $scope.data = $rootScope[kind];
    
    $scope.fetchMore = function() {
      if ($scope.data.end) return;
      
      if (kind == "nearby") {
        if (!$rootScope.coords) return;
        var args = $rootScope.coords;
        $scope.data.end = true;
      }
      else {
        var count = $scope.data.items.length;
        var args = count ? {"last": $scope.data.items[count-1].name} : {};
      }

      $http.get("/" + kind, {params: args})
      .success(function(items) {
        if (items.length)
          Array.prototype.push.apply($scope.data.items, items);
        else $scope.data.end = true;
      })
      .error(function(err) {
        console.log("Failed to download list items:", err);
        $scope.data.end = true;
      })
      .finally(function() {
        $scope.$broadcast("scroll.infiniteScrollComplete");
      })
    };
}]);
*/
