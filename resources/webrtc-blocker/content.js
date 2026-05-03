// Block WebRTC by removing APIs
(function() {
  'use strict';
  
  console.log('🛡️ WebRTC Blocker: Injecting...');
  
  // Remove RTCPeerConnection
  if (window.RTCPeerConnection) {
    window.RTCPeerConnection = undefined;
    delete window.RTCPeerConnection;
  }
  
  if (window.webkitRTCPeerConnection) {
    window.webkitRTCPeerConnection = undefined;
    delete window.webkitRTCPeerConnection;
  }
  
  if (window.mozRTCPeerConnection) {
    window.mozRTCPeerConnection = undefined;
    delete window.mozRTCPeerConnection;
  }
  
  // Remove RTCSessionDescription
  if (window.RTCSessionDescription) {
    window.RTCSessionDescription = undefined;
    delete window.RTCSessionDescription;
  }
  
  // Remove RTCIceCandidate
  if (window.RTCIceCandidate) {
    window.RTCIceCandidate = undefined;
    delete window.RTCIceCandidate;
  }
  
  // Block getUserMedia
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = function(constraints) {
      console.log('🛡️ WebRTC Blocker: Blocked getUserMedia call');
      return Promise.reject(new Error('WebRTC is disabled'));
    };
  }
  
  // Block legacy getUserMedia
  if (navigator.getUserMedia) {
    navigator.getUserMedia = function(constraints, success, error) {
      console.log('🛡️ WebRTC Blocker: Blocked legacy getUserMedia call');
      if (error) error(new Error('WebRTC is disabled'));
    };
  }
  
  if (navigator.webkitGetUserMedia) {
    navigator.webkitGetUserMedia = undefined;
    delete navigator.webkitGetUserMedia;
  }
  
  if (navigator.mozGetUserMedia) {
    navigator.mozGetUserMedia = undefined;
    delete navigator.mozGetUserMedia;
  }
  
  console.log('✅ WebRTC Blocker: Successfully blocked WebRTC APIs');
})();
