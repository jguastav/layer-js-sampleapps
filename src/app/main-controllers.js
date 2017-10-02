/* global angular layer */
'use strict';

var sampleControllers = angular.module('sampleAppControllers', []);

/**
 * Notes: data in this application is driven by Queries.  Queries can be set
 * to return Conversation, Message and Identity Objects or Instances.  Using a return of type Object
 * lets us have an immutable object that simplifies angular's scope comparisons.
 * An Instance provides methods that let us interact with the layer services.
 * Both are used in this application: Objects for managing angular state,
 * Instances for interacting with the WebSDK.
 */

/**
 * The Main Application Controller initializes the client
 * and loads the Chat Controller
 */
sampleControllers.controller('appCtrl', function ($scope) {

  var appId = window.layerSample.appId;
  $scope.appCtrlState = {
    isReady: false,
    client: new layer.Client({
      appId: appId
    })
  };

  /**
   * Client authentication challenge.
   * Sign in to Layer sample identity provider service.
   */
  $scope.appCtrlState.client.on('challenge', function(evt) {
    window.layerSample.getIdentityToken(evt.nonce, evt.callback);
  });

  /**
   * Once the client is ready, get our users (static data
   * for this sample) and render.
   */
  $scope.appCtrlState.client.on('ready', function() {
    $scope.appCtrlState.isReady = true;

    // Any changes to the query, update our rendering
    $scope.$apply();
  });

  /**
   * validate that the sample data has been properly set up
   */
  window.layerSample.validateSetup($scope.appCtrlState.client);

  window.layerSample.onLogin(function() {
    /**
     * Start authentication
     */
    $scope.appCtrlState.client.connect();
  });
});

/**
 * The Main Application Controller manages:
 * 1. Whether to show the identities-list or announcements dialog
 * 2. Tracking the currentConversation
 * 2. All routing (current conversation or new conversation)
 */
sampleControllers.controller('chatCtrl', function ($scope, $location) {
  $scope.chatCtrlState = {
    showParticipants: false,
    showAnnouncements: false,
    unreadAnnouncements: 0,
    currentConversation: null
  };

  /**
   * Get the Conversation from cache... or from the server if not cached.
   * Once loaded, set it as our currentConversation.
   */
  $scope.loadConversation = function loadConversation(id) {
    var conversation = $scope.appCtrlState.client.getConversation(id, true);
    conversation.once('conversations:loaded', function() {
      $scope.chatCtrlState.currentConversation = conversation.toObject();
      $scope.$digest();
    });
  };

  /**
   * Handle the user clicking to toggle presence
   */
  $scope.togglePresence = function togglePresence() {
    var user = $scope.appCtrlState.client.user;
    if (user.status === layer.Identity.STATUS.AVAILABLE) {
      user.setStatus(layer.Identity.STATUS.BUSY);
    } else {
      user.setStatus(layer.Identity.STATUS.AVAILABLE);
    }
  };

  /*
   * Whenever the url changes, Load the requested Conversation
   * (if any), update our state and render
   */
  function handleLocation() {
    var matches = $location.$$url.match(/\/conversations\/.{8}-.{4}-.{4}-.{4}-.{12}$/);

    // If the url matches a Conversation URL, show it.
    if (matches) {
      if ($scope.appCtrlState.client.isReady) {
        $scope.loadConversation('layer://' + matches[0]);
      } else {
        $scope.appCtrlState.client.once('ready', function() {
          $scope.loadConversation('layer://' + matches[0]);
        });
      }
      $scope.chatCtrlState.showParticipants = false;
    }
  }

  // Handle any change in location
  $scope.$on('$locationChangeSuccess', handleLocation);

  // Handle the initial url state we loaded the app with.
  handleLocation();


  // Start the process of creating a new Conversation
  $scope.showNewConversation = function() {
    $scope.chatCtrlState.showParticipants = true;
  };

  /**
   * The user selects a Conversation in the <layer-conversations-list>
   */
  $scope.selectConversation = function(evt) {
    $scope.updateSelectedConversation(evt.detail.item);
    $scope.$apply();
  };

  $scope.updateSelectedConversation = function(conversation) {
    $scope.chatCtrlState.currentConversation = conversation.toObject();
    $location.path(conversation.id.substring(8));
  };

  /**
   * Utility for getting the title for a Conversation
   */
  $scope.getConversationTitle = function(conversationObject) {
    if (conversationObject) {
      // metadata.conversationName is the preferred title
      if (conversationObject.metadata.conversationName) return conversationObject.metadata.conversationName;

      // A join of all participants names is the backup title.
      return conversationObject.participants
      .filter(function(identity) {
        return !identity.sessionOwner;
      })
      .map(function(identity) {
        return identity.displayName;
      }).join(', ');
    }
    return '';
  };

  $scope.onMessageNotification = function(evt) {
    console.log("onMessageNotification");
    $scope.playSound();
    if ((!$scope.chatCtrlState.currentConversation ||
        evt.detail.item.conversationId === $scope.chatCtrlState.currentConversation.id) &&
        !evt.detail.isBackground) {
      evt.preventDefault();
    }
  };

  $scope.playSound = function() {
      console.log("playSound");
      var audio = new Audio('sounds/beep.wav');
      audio.play();
  };



  $scope.onNotificationClick = function(evt) {
    var message = evt.detail.item;
    $scope.chatCtrlState.currentConversation = message.getConversation().toObject();
    $location.path(message.conversationId.replace(/^layer:\/\/\//, ''));
    $scope.$apply();
  };
});
