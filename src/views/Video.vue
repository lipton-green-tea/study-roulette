<template>
    <div class="main-video">
        <div id="connection-options" class="floating-menu" v-if="preview_screen">
            <a v-on:click="beginConnection( 'study' )" class="button1 bouncy">find a study buddy</a>
            <a v-on:click="beginConnection( 'chat' )" class="button1 bouncy" style="animation-delay:0.07s">find somebody to chat</a>
            <!-- <a v-on:click="reset" class="button1 bouncy" style="animation-delay:0.14s">my account</a> -->
        </div>
        <div id="call-options" v-if="in_call">
            <video :src-object.prop.camel="previewStream" muted autoplay ref="video" id="preview-video"/>
            <div id="call-actions">
                <a v-on:click="reportUser" class="button1Full">report</a>
                <a v-on:click="closeCall" class="button1Red">end call</a>
            </div>
        </div>
        <div id="timeout-screen" v-if="timeout">
            <div>
                <h2>Your search has timed out</h2>
                <p>Try again, or come back when more people are online.</p>
            </div>
            <a v-on:click="backToHome" class="button1">back</a>
        </div>
        <div id="search-options" v-if="searching">
            <div class="loader"></div>
            <a v-on:click="cancelSearch" id="cancel-search-button" class="button1">stop searching</a>
        </div>
        <div id="fullscreen-overlay" v-if="searching||timeout||preview_screen" style="opacity: 70%;"></div>
        <video :src-object.prop.camel="stream" :volume.prop.camel="volume" autoplay ref="video" id="fullscreen-video"/>
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
            in_call: false,
            timeout: false,
            volume: 0,
            partnerID: "",
            partnerEmail: "",
            stream: null,
            previewStream: null,
            localStream: null,
            remoteStream: null,
            peer: null,
            dataChannel: null,
            currentlyNegotiating: false,
            //socket: io('https://www.bath-water.com/', {transports: ['polling']})
            socket: io('https://robstoks-webrtc.nw.r.appspot.com/', {transports: ['polling']}),
            //socket: io('http://localhost:3000', {transports: ['polling']})
            database: firebase.firestore(),
            reported: false
        }
    },
    methods: {
        reportUser: function() {
            if(!this.reported) {
                let now = new Date()
                console.log("report details")
                console.log("reporterID", firebase.auth().currentUser.uid)
                console.log("reporterEmail", firebase.auth().currentUser.email)
                console.log("offenderID", this.partnerID)
                console.log("offenderEmail", this.partnerEmail)
                console.log("time", now.getTime())
                let report = {
                    reporterID: firebase.auth().currentUser.uid,
                    reporterEmail: firebase.auth().currentUser.email,
                    offenderID: this.partnerID,
                    offenderEmail: this.partnerEmail,
                    time: now.getTime(),
                    resolved: false
                }
                this.database.collection("reports").add(report)
                this.reported = true

                alert("we've recorded your report, and we'll be in touch shortly to discuss the incident.")
            } else {
                alert("You've already submitted a report. Please let us know any additional information when we get in touch.")
            }
        },

        cancelSearch: function() {
            const info = {
                email: firebase.auth().currentUser.email
            }
            this.socket.emit("cancel-search", info)
            this.searching = false
            this.preview_screen = true
        },

        backToHome: function() {
            this.timeout = false
            this.preview_screen = true
        },

        onLocalMediaStream: function() {
            if(this.localStream) {
                this.$refs.video.volume = 0
                this.$refs.video.srcObject = this.stream
            }
        },

        reset: function() {
            this.socket.emit("reset-queue")
        },

        openTimeout: function() {
            this.searching = false
            this.timeout = true
        },

        beginConnection: function(callType) {
            var outer_this = this
            this.socket.on("buddy-found", function(callInfo) {
                // processing

                outer_this.partnerEmail = callInfo.target_email

                outer_this.searching = false
                outer_this.in_call = true
                outer_this.volume = 1
                outer_this.previewStream = outer_this.localStream
                outer_this.startCall(callInfo); 
            })
            this.socket.on("queue-timeout", function() {
                if(outer_this.searching) {
                    outer_this.searching = false
                    outer_this.timeout = true
                }
            })
            this.searching = true
            this.preview_screen = false
            this.socket.emit("find-buddy", { 
                email: firebase.auth().currentUser.email,
                callType: callType
            });
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
                                sdp: outer_this.peer.localDescription 
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
                    console.log("setting remote session description")
                    var remoteSessionDescription = new RTCSessionDescription(answer.sdp);
                    outer_this.peer.setRemoteDescription(remoteSessionDescription)
                    console.log("done setting remote session description")
                }
            });

            this.socket.on('new-ice-candidate', candidate => {
                //  && outer_this.peer.remoteSessionDescription
                console.log(outer_this.peer)
                if(outer_this.peer) {
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
                this.partnerEmail = offer.target_email

                this.searching = false
                this.in_call = true
                this.volume = 1
                this.previewStream = this.localStream
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
                    .catch((error) => {
                        console.log("error while answering offer")
                        console.log(error)
                    });

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

            this.in_call = false
            this.preview_screen = true
            this.volume = 0
            this.previewStream = null
            this.stream = this.localStream
        },

        beforeUnload: function(e) {
            console.log(e)
            console.log("unloading page")
            if(this.searching) {
                const info = {
                    email: firebase.auth().currentUser.email
                }
                this.socket.emit("cancel-search", info)
            } else if (this.in_call) {
                this.closeCall()
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
    },
    created() {
        console.log("adding beforeunload handler")
        window.addEventListener('beforeunload', e => this.beforeUnload(e))
    },
    destroyed() {
        console.log("removed beforeunload handler")
        window.removeEventListener('beforeunload', e => this.beforeUnload(e))
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
    z-index: -1;
}

#call-options {
    position: fixed;
    right: 0;
    bottom: 0;
    min-width: 100%;
    min-height: 100%;
}

#preview-video {
    position: absolute;
    top: 10px;
    right:10px;
    width: 200px;
    transform: rotateY(180deg);
    -webkit-transform:rotateY(180deg); /* Safari and Chrome */
    -moz-transform:rotateY(180deg); /* Firefox */
}

#call-actions {
    position: absolute;
    bottom: 0px;
    right: 10px;
    height: 150px;
    width: 200px;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
}

#fullscreen-overlay {
    position: fixed;
    right: 0;
    bottom: 0;
    min-width: 100%;
    min-height: 100%;
    background-color: #000;
    opacity: 70%;
    z-index: 1;
}

#join-now-button {
    position: static;

    z-index: 3;
}

#ping-button {
    position: static;
    z-index: 3;
}

#reset-button {
    position: static;
    z-index: 3;
}

.floating-menu {
    border-radius: 25px;
    height: 300px;
    width: 400px;
    position: fixed;
    top: 50%;
    left: 50%;
    margin-top: -170px;
    margin-left: -200px;
    color: #2a8aad;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
}

#search-options {
    border-radius: 25px;
    height: 300px;
    width: 400px;
    position: fixed;
    top: 50%;
    left: 50%;
    margin-top: -100px;
    margin-left: -200px;
    color: #ffffff;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
}

#cancel-search-button {
    position: fixed;
    bottom: 30px;
    left: 50%;
    width: 180px;
    margin-top: 60px;
    margin-left: -74px;
}

.loader {
    position: fixed;
    top: 50%;
    left: 50%;
    border: 16px solid #f3f3f3; /* Light grey */
    border-top: 16px solid #2a8aad; /* Blue */
    border-radius: 50%;
    width: 120px;
    height: 120px;
    margin-top: -100px;
    margin-left: -60px;
    animation: spin 2s linear infinite;
    z-index: 2;
}

#timeout-screen {
    border-radius: 25px;
    height: 300px;
    width: 400px;
    position: fixed;
    top: 50%;
    left: 50%;
    margin-top: -150px;
    margin-left: -200px;
    color: #ffffff;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

a.button1{
    display:inline-block;
    padding:0.35em 1.2em;
    border:0.1em solid #FFFFFF;
    margin:0 0.3em 0.3em 0;
    border-radius:0.12em;
    box-sizing: border-box;
    text-decoration:none;
    font-family:'Roboto',sans-serif;
    font-weight:300;
    color:#FFFFFF;
    text-align:center;
    transition: all 0.2s;
    -webkit-user-select: none; /* Safari */        
    -moz-user-select: none; /* Firefox */
    -ms-user-select: none; /* IE10+/Edge */
    user-select: none; /* Standard */
}

a.button1:hover{
    color:#FFFFFF;
    background-color:#2a8aad;
    -webkit-user-select: none; /* Safari */        
    -moz-user-select: none; /* Firefox */
    -ms-user-select: none; /* IE10+/Edge */
    user-select: none; /* Standard */
}

a.button1Full{
    display:inline-block;
    padding:0.35em 1.2em;
    border:0.1em solid #FFFFFF;
    margin:0 0.3em 0.3em 0;
    border-radius:0.12em;
    box-sizing: border-box;
    text-decoration:none;
    font-family:'Roboto',sans-serif;
    font-weight:300;
    color:#000000;
    background-color: #FFFFFF;
    text-align:center;
    transition: all 0.2s;
    -webkit-user-select: none; /* Safari */        
    -moz-user-select: none; /* Firefox */
    -ms-user-select: none; /* IE10+/Edge */
    user-select: none; /* Standard */
}

a.button1Full:hover{
    color:#FFFFFF;
    background-color:#2a8aad;
    -webkit-user-select: none; /* Safari */        
    -moz-user-select: none; /* Firefox */
    -ms-user-select: none; /* IE10+/Edge */
    user-select: none; /* Standard */
}

a.button1Red{
    display:inline-block;
    padding:0.35em 1.2em;
    border:0.1em solid #FFFFFF;
    margin:0 0.3em 0.3em 0;
    border-radius:0.12em;
    box-sizing: border-box;
    text-decoration:none;
    font-family:'Roboto',sans-serif;
    font-weight:300;
    color:#FF0000;
    background-color: #FFFFFF;
    text-align:center;
    transition: all 0.2s;
    -webkit-user-select: none; /* Safari */        
    -moz-user-select: none; /* Firefox */
    -ms-user-select: none; /* IE10+/Edge */
    user-select: none; /* Standard */
}

a.button1Red:hover{
    color:#FFFFFF;
    background-color:#FF0000;
    -webkit-user-select: none; /* Safari */        
    -moz-user-select: none; /* Firefox */
    -ms-user-select: none; /* IE10+/Edge */
    user-select: none; /* Standard */
}

@media all and (max-width:30em){
    a.button1{
        display:block;
        margin:0.4em auto;
    }

    a.button1Red{
        display:block;
        margin:0.4em auto;
    }

    a.button1Full{
        display:block;
        margin:0.4em auto;
    }
}

.bouncy{
    animation:bouncy 5s infinite linear;
    position:relative;
}

@keyframes bouncy {
    0%{top:0em}
    40%{top:0em}
    43%{top:-0.9em}
    46%{top:0em}
    48%{top:-0.4em}
    50%{top:0em}
    100%{top:0em;}
}
</style>