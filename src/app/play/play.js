angular.module('sp.player.play', [
  'sp.player.common.palettes',

  'uiSocket', 
  'uiAuth',
  'uiImagePlayer', 
  'uiAudioPlayer',

  'ui.router'
])

.config(function($stateProvider, authProvider, socketProvider) {

  $stateProvider.state('play', {
    url: '/play/:paletteId',
    templateUrl: 'play/play.tpl.html',
    controller: 'PlayCtrl',
    resolve: {
      user: authProvider.requireUser,
      socketInfo: function(user, socket) {
        return socketProvider.requireAuthenticatedConnection(socket, user);
      },
      palette: function(palettes, $stateParams) {
        var paletteId = $stateParams['paletteId'];
        return palettes.one(paletteId).then(function(palette) {
          return palette;  // not really used
        });
      }
    }
  });
})

.controller('PlayCtrl', function($scope, $location, socket, $routeParams, Palettes, audioPlayer, imagePlayer, palette) {
  console.log('\n**** PlayCtrl ****');

  var resetPlayers = function() {
    audioPlayer.reset();
    imagePlayer.reset();
    //initProgress();
  };

  $scope.progress = {
    audio: {done: true},
    image: {done: true},
    done: true
  };

  $scope.$on('$destroy', function (event) {
    console.log("DESTROY!");
    // socket.removeListener(this);
  });

  // Palette is loaded when page is loaded
  $scope.palette = palette; // Palettes.getPalette();
  //initProgress();

  // Send palette to performer
  socket.emit('activePalette', $scope.palette);

  // Incoming request from Performer
  socket.on('onRequestPalette', function (paletteId) {
    console.log('PlayCtrl.onRequestPalette: Get palette ', paletteId);

    // Performer wants us to switch to another palette
    if ($scope.palette._id === paletteId) {
      // We're already playing this palette
      // TODO: Do this onRouteChange instead?

      socket.emit('activePalette', $scope.palette);
      $location.path('/play/' + paletteId);
      //$route.reload();
    } else {
      // Change location to refresh the route and load the new palette
      socket.emit('activePalette', $scope.palette);
      $location.path('/play/' + paletteId);
    }
  });

  imagePlayer.on(['add','progress'], function(progress) {
    $scope.progress.image = progress;
    $scope.progress.image.style = {width: ($scope.progress.image.loaded / $scope.progress.image.count * 100) + '%'};
    $scope.progress.done = $scope.progress.image.done && $scope.progress.audio.done;

    if (!$scope.$$phase) {
      $scope.$apply();
    }            
  });

  audioPlayer.on(['add','progress'], function(progress) {
    //console.log("Audio progress: ", $scope.progress.audio);
    $scope.progress.audio = progress;
    $scope.progress.audio.style = {width: ($scope.progress.audio.loaded / $scope.progress.audio.count * 100) + '%'};
    $scope.progress.done = $scope.progress.image.done && $scope.progress.audio.done;

    if ($scope.progress.audio.done) {
      audioPlayer.printSounds();
    }

    if (!$scope.$$phase) {
      $scope.$apply();
    }            
  });

  // Preload images
  imagePlayer.preloadPaletteImages($scope.palette);

  $scope.valueUpdate = false;
  $scope.imageOpacity = {};

  // Notify Performer if we navigate away (no palette active)
  $scope.$on('$locationChangeStart', function (event, next, current) {
    console.log('>>> PlayCtrl: on $locationChangestart');
    //socket.emit('paletteDeactivate');
  });

  // Reset audio and images when back button is pressed
  $scope.$on('$routeChangeStart', function(next, current) {
    console.log('>>> PlayCtrl: on $routeChangeStart');
    resetPlayers();
    socket.removeListeners();  // Avoid duplicate event listeners
  });

  // Palette.value has been updated by Performer
  socket.on('onValueUpdate', function (data) {
    console.log('PlayCtrl.onValueUpdate: ', data);

    if (data.assetId === null) {
      return;
    }

    $scope.valueUpdate = true;
    var asset = $scope.palette.assets[data.assetId];
    console.log('Asset', asset);
    console.log('Palette', $scope.palette.name);
    asset.value = data.value;

    switch(asset.type) {
      case 'image':
        $scope.imageOpacity = {'opacity': asset.value.opacity};
        console.log('opacity: ', $scope.imageOpacity);

        //$scope.imageClass = asset.value.visible ? 'show' : 'hide';
        $scope.imageUrl = imagePlayer.getImageUrl(asset);
        break;
      case 'sound':
        if (asset.value.state === 'stopped') {
            audioPlayer.stop(data.assetId);
        } else if (asset.value.state === 'playing') {
            audioPlayer.play(data.assetId);
        } else {
            //console.log('Unknown sound state');
        }

        if (typeof asset.value.volume !== 'undefined') {
            audioPlayer.setVolume(data.assetId, asset.value.volume);
        }
        break;
      case 'light':
        console.log('onValueUpdate light:', asset.value);
        break;
    }

  });

  // These should move to services
  var getSoundUrl = function(asset) {
    var url = '/sound/' + asset.source.id + '.' + asset.source.extension;
    return url;
  };

  // Setup sounds
  for (var i = 0;i < $scope.palette.assets.length;i++){
    var asset = $scope.palette.assets[i];
    if (asset.type === 'sound')  {
      var options = {};
      options.loop = asset.loop || false;
      options.autoplay = options.loop; // autostart looping sounds
      options.volume = options.loop ? 0.0 : 0.9;  // start
      audioPlayer.newSound(i, getSoundUrl(asset), options);
      // TODO: Hack, it doesn't work to pass 0.0 as volume on creation
      if (options.loop) {
         audioPlayer.setVolume(i, 0.0);
      }
    }
  }

 /* $scope.play = function() {
      console.log('Running palette: ' + $scope.palette.name);
      socket.emit('paletteRun', $scope.palette);
  }; */

});
