angular.module('sp.player', [
  'templates-app',
  'templates-common',
  'templates-shared',

  'sp.player.waiting',
  'sp.player.play',

  'sp.player.common.config',

  'uiAuth', 
  'spUtils', 
  'uiSocket', 

  'ui.router',
  'ui.bootstrap'
])

.config(function($locationProvider, $urlRouterProvider, config, socketProvider, authProvider, $stateProvider, authConfigProvider) {
  // Route configuration
  $locationProvider.html5Mode(true);  // no hash-urls

  // Redirect to connecting state.
  $urlRouterProvider.when('/', '/waiting');

  // Abstract state for different access levels
  $stateProvider.state('user', {
    abstract: true,
    template: '<ui-view/>',
    resolve: {
      user: authProvider.requireUser,
      socketInfo: function(user, socket, utils, auth) {
        var ns = utils.getSocketNamespace(user);
        var token = auth.getToken(); 
        utils.getSocketRoom(user).then(function(room) {
          console.log('got room', room);
          return socketProvider.requireAuthenticatedConnection(socket, ns, room, token);
        });
      }
    }
  });

  authConfigProvider.setTokenKey('spPlayerToken'); 
  authConfigProvider.setApiBase(config.apiBase); 

})

.controller('AppCtrl', function() {
})
;
// TODO: Temp fix for karma.
window.env = window.env || {};
