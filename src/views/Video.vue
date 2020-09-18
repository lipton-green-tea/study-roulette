<template>
    <div class="main-video">
        <div id="connection-options" v-if="preview_screen">
            <button id="ping-button" @click="pingSocket">ping server</button>
            <button id="join-now-button" @click="beginConnection">find a study buddy</button>
            <button id="reset-button" @click="reset">reset..................................</button>
        </div>
        <video :src-object.prop.camel="stream" autoplay muted ref="video" id="fullscreen-video"/>
    </div>
</template>

<script>
import io from 'socket.io-client';
import firebase from 'firebase';

export default {
    name: 'Video',
    data() {
        return {
            preview_screen: true,
            searching: false,
            video_screen: false,
            stream: null,
            localStream: null,
            remoteStream: null,
            peer: null,
            dataChannel: null,
            currentlyNegotiating: false,
            socket: io('https://www.bath-water.com/', {transports: ['polling']})
            //socket: io('http://localhost:3000', {transports: ['polling']})
        }
    },
    methods: {
        onLocalMediaStream: function() {
            if(this.localStream) {
                this.$refs.video.volume = 0
                this.$refs.video.srcObject = this.stream
            }
        },

        reset: function() {
            this.socket.emit("reset-queue")
        },

        beginConnection: function() {
            var outer_this = this
            this.socket.on("buddy-found", function(callInfo) {
                // processing

                outer_this.searching = false
                outer_this.startCall(callInfo); 
            })
            this.searching = true
            this.socket.emit("find-buddy", { email: firebase.auth().currentUser.email });
        },

        pingSocket: function() {
            console.log("pinging socket");
            this.socket.emit("ping", "mystring");
        },

        onChannelMessage: function(message) {
            console.log("new message: " + message);
            // add switch statements here
        },

        startCall: function(callInfo) {
            console.log('call started'); //temp

            var candidatesBuffer = [];
            var outer_this = this

            this.socket.on("token", data => {
                console.log("token recieved");
                console.log(data);
                var config = { iceServers: data.iceServers };
                this.peer = new RTCPeerConnection(config);

                this.dataChannel = this.peer.createDataChannel('data-channel',{negotiated:true, id:0});
                this.dataChannel.addEventListener("open", (event) => {
                    console.log("data-channel open");
                    console.log(event)
                })
                this.dataChannel.onmessage = this.onChannelMessage;

                this.localStream.getTracks().forEach(function(track) {
                    outer_this.peer.addTrack(track, outer_this.localStream);
                    console.log("adding track"); // temp 
                    console.log(track); // temp
                });

                this.peer.oniceconnectionstatechange = function() {
                    console.log("new ice connection state: " + outer_this.peer.iceConnectionState);
                    if(outer_this.peer.iceConnectionState === "closed") {
                        outer_this.closeCall()
                    } else if(outer_this.peer.iceConnectionState === "failed") {
                        outer_this.closeCall()
                    } else if(outer_this.peer.iceConnectionState === "disconnected") {
                        outer_this.closeCall()
                    } else if(!outer_this.peer.iceConnectionState) {
                        outer_this.closeCall()
                    }
                };
        
                this.peer.onicecandidate = function(event) {
                    if(event.candidate) {
                        console.log("initiator got candidate");
                        outer_this.socket.emit("new-ice-candidate", { 
                            email: firebase.auth().currentUser.email,
                            target_email: callInfo.target_email,
                            candidate: event.candidate 
                        });
                    } else {
                        console.log("all ice candidates retrieved");
                    }
                    
                };

                this.peer.ontrack = function(event) {
                    outer_this.addRemoteStream(event.streams[0]);
                };

                this.peer.onnegotiationneeded = function() {
                    console.log("negotatiation needed called");
                    if(!outer_this.currentlyNegotiating) {
                        console.log("creating offer");
                        outer_this.currentlyNegotiating = true
                        outer_this.peer.createOffer().then(function(offer){
                            console.log("setting local description")
                            outer_this.peer.setLocalDescription(offer);
                        })
                        .then(function() {
                            console.log("sending video-offer");
                            console.log(outer_this.peer.localDescription);
                            outer_this.socket.emit("video-offer", { 
                                email: firebase.auth().currentUser.email,
                                target_email: callInfo.target_email,
                                sdp:outer_this.peer.localDescription 
                            });
                        })
                        .catch((error) => {
                            console.log("error while handling negotiationneeded");
                            console.log(error);
                        });
                    }
                };

                this.peer.onsignalingstatechange = function() {
                    console.log("signalling state changed: " + outer_this.peer.signalingState);
                    outer_this.currentlyNegotiating = (outer_this.peer.signalingState != "stable");
                }
            });

            this.socket.on('video-answer', answer => {
                console.log("received video answer");
                if(outer_this.peer) {
                    var remoteSessionDescription = new RTCSessionDescription(answer.sdp);
                    outer_this.peer.setRemoteDescription(remoteSessionDescription)
                }
            });

            this.socket.on('new-ice-candidate', candidate => {
                if(outer_this.peer && outer_this.peer.remoteSessionDescription) {
                    console.log('adding ice candidate');
                    console.log(candidate);
                    var ICECandidate = new RTCIceCandidate(candidate.candidate);
                    outer_this.peer.addIceCandidate(ICECandidate);
                } else {
                    console.log('adding ice candidate to buffer');
                    candidatesBuffer.push(candidate);
                }
            });

            this.socket.emit("token")
        },

        addRemoteStream: function(stream) {
            console.log("adding remote stream to remote audio element");
            //this.remoteVideo.volume = 1;
            //AudioChat.remoteStream = stream;
            this.remoteStream = stream;
            this.stream = this.remoteStream;
        },

        onOffer: function(offer) {
            if(offer.sdp) {
                this.socket.emit("token")

                var candidatesBuffer = [];

                console.log("offer-sdp")
                console.log(offer.sdp)

                var remoteSessionDescription = new RTCSessionDescription(offer.sdp);
                var outer_this = this

                this.socket.on("token", data => {
                    console.log("token recieved");
                    console.log(data);
                    var config = { iceServers: data.iceServers };
                    this.peer = new RTCPeerConnection(config);

                    this.dataChannel = this.peer.createDataChannel('data-channel',{negotiated:true, id:0});
                    this.dataChannel.addEventListener("open", (event) => {
                        console.log("data-channel open");
                        console.log(event)
                    })
                    this.dataChannel.onmessage = this.onChannelMessage;

                    this.peer.oniceconnectionstatechange = function() {
                        console.log("new ice connection state: " + this.peer.iceConnectionState);
                        if(outer_this.peer.iceConnectionState === "closed") {
                            outer_this.closeCall()
                        } else if(outer_this.peer.iceConnectionState === "failed") {
                            outer_this.closeCall()
                        } else if(outer_this.peer.iceConnectionState === "disconnected") {
                            outer_this.closeCall()
                        } else if(!outer_this.peer.iceConnectionState) {
                            outer_this.closeCall()
                        }
                    };

                    this.peer.onicecandidate = function(event) {
                        if(event.candidate) {
                            console.log("initiator got candidate");
                            outer_this.socket.emit("new-ice-candidate", { 
                                email: firebase.auth().currentUser.email,
                                target_email: offer.email,
                                candidate:event.candidate 
                            });
                        } else {
                            console.log("all ice candidates retrieved");
                        }
                        
                    };

                    this.peer.ontrack = function(event) {
                        outer_this.addRemoteStream(event.streams[0]);
                    };

                    this.peer.onnegotiationneeded = function() {
                        console.log("creating offer");
                        outer_this.peer.createOffer().then(function(offer){
                            console.log("setting local description")
                            outer_this.peer.setLocalDescription(offer);
                        })
                        .then(function() {
                            console.log("sending audio-offer")
                            outer_this.socket.emit("audio-offer", { 
                                email: firebase.auth().currentUser.email,
                                target_email: offer.email,
                                sdp: outer_this.peer.localDescription 
                            });
                        })
                        .catch((error) => {
                            console.log("error while handling negotiationneeded");
                            console.log(error);
                        });
                    };

                    this.peer.setRemoteDescription(remoteSessionDescription).then(function() {
                        console.log('setting tracks') // temp
                        outer_this.localStream.getTracks().forEach(track => outer_this.peer.addTrack(track, outer_this.localStream));
                        outer_this.localStream.getTracks().forEach(track => track.enabled = false);
                    })
                    .then(function() {
                        console.log('creating answer') // temp
                        return outer_this.peer.createAnswer();
                    })
                    .then(function(answer) {
                        console.log('setting local description') // temp
                        return outer_this.peer.setLocalDescription(answer);
                    })
                    .then(function() {
                        console.log('emitting video-answer') // temp
                        outer_this.socket.emit("video-answer", {
                            email: firebase.auth().currentUser.email,
                            target_email: offer.email,
                            sdp:outer_this.peer.localDescription 
                        });
                    })
                    .catch(console.log("error while answering offer"));

                    while(candidatesBuffer.length > 0) {
                        var candidate = candidatesBuffer.pop();
                        console.log('adding ice candidate from buffer');
                        console.log(candidate);
                        var ICECandidate = new RTCIceCandidate(candidate.candidate);
                        this.peer.addIceCandidate(ICECandidate);
                    }
                });

                this.socket.on('new-ice-candidate', candidate => {
                    if(this.peer) {
                        console.log('adding ice candidate');
                        console.log(candidate);
                        var ICECandidate = new RTCIceCandidate(candidate.candidate);
                        this.peer.addIceCandidate(ICECandidate);
                    } else {
                        console.log('adding ice candidate to buffer');
                        candidatesBuffer.push(candidate);
                    }
                });
            }
        },

        closeCall: function() {
            console.log("closing call")
            if(this.peer) {
                this.peer.ontrack = null;
                this.peer.onremovetrack = null;
                this.peer.onremovestream = null;
                this.peer.onicecandidate = null;
                this.peer.oniceconnectionstatechange = null;
                this.peer.onsignalingstatechange = null;
                this.peer.onicegatheringstatechange = null;
                this.peer.onnegotiationneeded = null;

                this.remoteStream = null

                this.peer.getSenders().forEach(track => {this.peer.removeTrack(track), console.log("track removed")});

                this.peer.close();
                this.peer = null;
            }

            if(this.statusChannel) {
                this.statusChannel.close();
            }
        }
    }, //hello
    mounted() {
        const outer_this = this
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(function(stream) {
            outer_this.localStream = stream;
            outer_this.stream = stream
            outer_this.socket.on("video-offer", outer_this.onOffer);
            outer_this.socket.on("ping", function(response) {
                console.log("received ping: " + response)
            })
            outer_this.socket.emit("join", {
                email: firebase.auth().currentUser.email
            })
        })
        .catch(function(error) {
            console.log(error)
        })
    }
}
</script>

<style scoped>
#fullscreen-video {
    position: fixed;
    right: 0;
    bottom: 0;
    min-width: 100%;
    min-height: 100%;
}

#join-now-button {
    position: absolute;
    z-index: 2;
}

#ping-button {
    position: absolute;
    z-index: 3;
}

#reset-button {
    position: absolute;
    z-index: 1;
}
</style>